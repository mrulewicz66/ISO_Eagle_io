const express = require('express');
const router = express.Router();
const db = require('../db/database');
const CoinGlassService = require('../services/coinGlassService');
const SoSoValueService = require('../services/sosoValueService');
const CoinGeckoService = require('../services/coinGeckoService');

// Initialize services
const coinGlass = new CoinGlassService(process.env.COINGLASS_API_KEY);
const sosoValue = new SoSoValueService(process.env.SOSOVALUE_API_KEY);
const coinGecko = new CoinGeckoService(process.env.COINGECKO_API_KEY);

// Get latest ETF flows
router.get('/etf-flows', async (req, res) => {
    try {
        const { asset, days = 30 } = req.query;

        let query = `
            SELECT date, asset, etf_name, net_flow, total_holdings
            FROM etf_flows
            WHERE date >= NOW() - INTERVAL '${parseInt(days)} days'
        `;

        const params = [];
        if (asset) {
            params.push(asset);
            query += ` AND asset = $1`;
        }

        query += ` ORDER BY date DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching ETF flows:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get exchange reserves
router.get('/exchange-reserves', async (req, res) => {
    try {
        const { crypto } = req.query;

        // Get latest balance per exchange (exclude 'unknown' and zero balances)
        let query = `
            SELECT DISTINCT ON (exchange_name)
                timestamp, crypto_symbol, exchange_name, balance
            FROM exchange_reserves
            WHERE exchange_name != 'unknown' AND balance::numeric > 0
        `;

        const params = [];
        if (crypto) {
            params.push(crypto);
            query += ` AND crypto_symbol = $1`;
        }

        query += ` ORDER BY exchange_name, timestamp DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching exchange reserves:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current prices
router.get('/prices', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT ON (crypto_symbol)
                crypto_symbol, price_usd, market_cap, volume_24h, price_change_24h, price_change_7d, timestamp
            FROM price_data
            ORDER BY crypto_symbol, timestamp DESC
        `;

        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Dashboard summary
router.get('/dashboard-summary', async (req, res) => {
    try {
        const [etfFlows, reserves, prices] = await Promise.all([
            db.query(`
                SELECT asset, SUM(net_flow) as total_flow
                FROM etf_flows
                WHERE date >= NOW() - INTERVAL '7 days'
                GROUP BY asset
            `),
            db.query(`
                SELECT crypto_symbol, SUM(balance) as total_balance
                FROM (
                    SELECT DISTINCT ON (crypto_symbol, exchange_name)
                        crypto_symbol, exchange_name, balance
                    FROM exchange_reserves
                    ORDER BY crypto_symbol, exchange_name, timestamp DESC
                ) latest
                GROUP BY crypto_symbol
            `),
            db.query(`
                SELECT COUNT(DISTINCT crypto_symbol) as tracked_assets
                FROM price_data
            `)
        ]);

        res.json({
            etfFlows: etfFlows.rows,
            exchangeReserves: reserves.rows,
            trackedAssets: prices.rows[0]?.tracked_assets || 0
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get XRP ETF flows from multiple sources (CoinGlass + SoSoValue fallback)
router.get('/xrp-etf-flows', async (req, res) => {
    try {
        // Fetch from both sources in parallel
        const [coinGlassFlows, sosoFlows] = await Promise.allSettled([
            coinGlass.getXRPETFFlows(),
            sosoValue.getXRPETFFlows()
        ]);

        let allFlows = [];

        // Transform CoinGlass data
        if (coinGlassFlows.status === 'fulfilled' && coinGlassFlows.value) {
            const cgFlows = coinGlassFlows.value.map(flow => ({
                date: new Date(flow.timestamp).toISOString().split('T')[0],
                timestamp: flow.timestamp,
                net_flow: flow.flow_usd,
                price_usd: flow.price_usd,
                etf_breakdown: flow.etf_flows?.map(etf => ({
                    ticker: etf.etf_ticker,
                    flow_usd: etf.flow_usd || 0
                })) || [],
                source: 'coinglass'
            }));
            allFlows = [...allFlows, ...cgFlows];
            console.log(`CoinGlass XRP ETF: ${cgFlows.length} records, latest: ${cgFlows[cgFlows.length - 1]?.date || 'none'}`);
        }

        // Transform SoSoValue data
        if (sosoFlows.status === 'fulfilled' && sosoFlows.value && sosoFlows.value.length > 0) {
            const ssFlows = sosoFlows.value.map(flow => ({
                date: flow.date,
                timestamp: new Date(flow.date).getTime(),
                net_flow: flow.totalNetInflow,
                price_usd: null, // SoSoValue doesn't include price
                etf_breakdown: [],
                source: 'sosovalue'
            }));
            allFlows = [...allFlows, ...ssFlows];
            console.log(`SoSoValue XRP ETF: ${ssFlows.length} records, latest: ${ssFlows[ssFlows.length - 1]?.date || 'none'}`);
        }

        if (allFlows.length === 0) {
            return res.status(503).json({ error: 'No XRP ETF data available from any source' });
        }

        // Merge data by date, preferring CoinGlass (more detailed) over SoSoValue
        const flowsByDate = new Map();
        for (const flow of allFlows) {
            const existing = flowsByDate.get(flow.date);
            // Prefer CoinGlass data (has ETF breakdown and price), or take newer data
            if (!existing || (flow.source === 'coinglass' && existing.source !== 'coinglass')) {
                flowsByDate.set(flow.date, flow);
            }
        }

        // Sort by date ascending
        const mergedFlows = Array.from(flowsByDate.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        console.log(`Merged XRP ETF: ${mergedFlows.length} records, latest: ${mergedFlows[mergedFlows.length - 1]?.date || 'none'}`);

        res.json(mergedFlows);
    } catch (error) {
        console.error('Error fetching XRP ETF flows:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get XRP exchange balances from CoinGlass (real-time)
router.get('/xrp-exchange-balances', async (req, res) => {
    try {
        const balances = await coinGlass.getXRPExchangeReserves();
        if (!balances) {
            return res.status(503).json({ error: 'CoinGlass API unavailable or upgrade required' });
        }

        // Transform and sort by balance
        const transformedBalances = balances
            .map(b => ({
                exchange: b.exchange_name,
                balance: b.total_balance,
                change_1d: b.balance_change_1d,
                change_1d_pct: b.balance_change_percent_1d,
                change_7d: b.balance_change_7d,
                change_7d_pct: b.balance_change_percent_7d,
                change_30d: b.balance_change_30d,
                change_30d_pct: b.balance_change_percent_30d
            }))
            .sort((a, b) => b.balance - a.balance);

        // Calculate totals
        const totalBalance = transformedBalances.reduce((sum, b) => sum + b.balance, 0);
        const total1dChange = transformedBalances.reduce((sum, b) => sum + (b.change_1d || 0), 0);
        const total7dChange = transformedBalances.reduce((sum, b) => sum + (b.change_7d || 0), 0);
        const total30dChange = transformedBalances.reduce((sum, b) => sum + (b.change_30d || 0), 0);

        res.json({
            exchanges: transformedBalances,
            totals: {
                balance: totalBalance,
                change_1d: total1dChange,
                change_7d: total7dChange,
                change_30d: total30dChange
            }
        });
    } catch (error) {
        console.error('Error fetching XRP exchange balances:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check raw exchange data
router.get('/debug/exchange-raw', async (req, res) => {
    try {
        const balances = await coinGlass.getXRPExchangeReserves();
        if (!balances || balances.length === 0) {
            return res.json({ error: 'No data', raw: balances });
        }
        // Return first 2 exchanges with all their fields
        res.json({
            count: balances.length,
            sample: balances.slice(0, 2),
            allFields: Object.keys(balances[0] || {})
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get XRP 7-day trading volume (from CoinGecko)
router.get('/xrp-7d-volume', async (req, res) => {
    try {
        const volume7d = await coinGecko.get7dVolume('ripple');
        if (volume7d === null) {
            return res.status(503).json({ error: 'Unable to fetch 7d volume data' });
        }
        res.json({ volume_7d: volume7d });
    } catch (error) {
        console.error('Error fetching XRP 7d volume:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get XRP exchange balance history for charts
router.get('/xrp-exchange-balance-history', async (req, res) => {
    try {
        const chartData = await coinGlass.getExchangeBalanceChart('XRP');
        if (!chartData || !chartData.time_list || !chartData.data_map) {
            return res.status(503).json({ error: 'Historical exchange data unavailable' });
        }

        // Transform into chart-friendly format
        // Each point: { date, timestamp, total, exchanges: { Binance: x, OKX: y, ... } }
        const timeList = chartData.time_list;
        const dataMap = chartData.data_map;
        const exchanges = Object.keys(dataMap);

        const history = timeList.map((timestamp, i) => {
            const point = {
                date: new Date(timestamp).toISOString().split('T')[0],
                timestamp,
                total: 0,
                exchanges: {}
            };

            for (const exchange of exchanges) {
                const balance = dataMap[exchange][i] || 0;
                point.exchanges[exchange] = balance;
                point.total += balance;
            }

            return point;
        });

        res.json({
            history,
            exchanges,
            dateRange: {
                start: history[0]?.date,
                end: history[history.length - 1]?.date,
                points: history.length
            }
        });
    } catch (error) {
        console.error('Error fetching XRP exchange balance history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get BTC ETF flows for comparison (cumulative from day 0)
router.get('/btc-etf-flows', async (req, res) => {
    try {
        const btcFlows = await coinGlass.getBTCETFFlows();
        if (!btcFlows || btcFlows.length === 0) {
            return res.status(503).json({ error: 'BTC ETF data unavailable' });
        }

        // Transform and calculate cumulative flows
        let cumulative = 0;
        const flows = btcFlows
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((flow, index) => {
                cumulative += flow.flow_usd || 0;
                return {
                    day: index, // Day 0, 1, 2, etc. from ETF launch
                    date: new Date(flow.timestamp).toISOString().split('T')[0],
                    timestamp: flow.timestamp,
                    net_flow: flow.flow_usd || 0,
                    cumulative_flow: cumulative
                };
            });

        res.json({
            flows,
            launch_date: flows[0]?.date,
            total_days: flows.length,
            total_cumulative: cumulative
        });
    } catch (error) {
        console.error('Error fetching BTC ETF flows:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get ETH ETF flows for comparison (cumulative from day 0)
router.get('/eth-etf-flows', async (req, res) => {
    try {
        const ethFlows = await coinGlass.getETHETFFlows();
        if (!ethFlows || ethFlows.length === 0) {
            return res.status(503).json({ error: 'ETH ETF data unavailable' });
        }

        // Transform and calculate cumulative flows
        let cumulative = 0;
        const flows = ethFlows
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((flow, index) => {
                cumulative += flow.flow_usd || 0;
                return {
                    day: index, // Day 0, 1, 2, etc. from ETF launch
                    date: new Date(flow.timestamp).toISOString().split('T')[0],
                    timestamp: flow.timestamp,
                    net_flow: flow.flow_usd || 0,
                    cumulative_flow: cumulative
                };
            });

        res.json({
            flows,
            launch_date: flows[0]?.date,
            total_days: flows.length,
            total_cumulative: cumulative
        });
    } catch (error) {
        console.error('Error fetching ETH ETF flows:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check data sources
router.get('/debug/etf-sources', async (req, res) => {
    try {
        const [cgResult, ssResult] = await Promise.allSettled([
            coinGlass.getXRPETFFlows(),
            sosoValue.getXRPETFFlows()
        ]);

        const coinGlassData = cgResult.status === 'fulfilled' ? cgResult.value : null;
        const sosoData = ssResult.status === 'fulfilled' ? ssResult.value : null;

        const cgLatest = coinGlassData?.length > 0
            ? new Date(coinGlassData[coinGlassData.length - 1].timestamp).toISOString().split('T')[0]
            : null;
        const ssLatest = sosoData?.length > 0
            ? sosoData[sosoData.length - 1].date
            : null;

        res.json({
            timestamp: new Date().toISOString(),
            coinglass: {
                status: cgResult.status,
                error: cgResult.reason?.message || null,
                recordCount: coinGlassData?.length || 0,
                latestDate: cgLatest,
                last3Records: coinGlassData?.slice(-3).map(r => ({
                    date: new Date(r.timestamp).toISOString().split('T')[0],
                    flow_usd: r.flow_usd
                })) || []
            },
            sosovalue: {
                status: ssResult.status,
                error: ssResult.reason?.message || null,
                recordCount: sosoData?.length || 0,
                latestDate: ssLatest,
                last3Records: sosoData?.slice(-3).map(r => ({
                    date: r.date,
                    totalNetInflow: r.totalNetInflow
                })) || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WAITLIST ENDPOINTS
// ============================================

// Join waitlist - POST /api/waitlist
router.post('/waitlist', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email || !email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Get IP and user agent for analytics
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;

        // Check if email already exists
        const existingCheck = await db.query(
            'SELECT id FROM waitlist WHERE email = $1',
            [normalizedEmail]
        );

        if (existingCheck.rows.length > 0) {
            console.log(`Waitlist signup: ${normalizedEmail} (already exists)`);
            return res.json({
                success: true,
                message: "You're already on the waitlist!",
                isNew: false
            });
        }

        // Insert new email
        await db.query(
            `INSERT INTO waitlist (email, ip_address, user_agent, source)
             VALUES ($1, $2, $3, $4)`,
            [normalizedEmail, ipAddress, userAgent, 'dashboard']
        );

        console.log(`Waitlist signup: ${normalizedEmail} (new)`);

        res.json({
            success: true,
            message: 'Successfully joined the waitlist!',
            isNew: true
        });
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        res.status(500).json({ error: 'Failed to join waitlist. Please try again.' });
    }
});

// Get waitlist count (for social proof) - GET /api/waitlist/count
router.get('/waitlist/count', async (req, res) => {
    try {
        const result = await db.query('SELECT COUNT(*) as count FROM waitlist');
        const count = parseInt(result.rows[0].count, 10);

        res.json({ count });
    } catch (error) {
        console.error('Error getting waitlist count:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
