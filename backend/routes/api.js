const express = require('express');
const router = express.Router();
const db = require('../db/database');
const CoinGlassService = require('../services/coinGlassService');

// Initialize CoinGlass service
const coinGlass = new CoinGlassService(process.env.COINGLASS_API_KEY);

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
        const { crypto, hours = 24 } = req.query;

        let query = `
            SELECT timestamp, crypto_symbol, exchange_name, balance
            FROM exchange_reserves
            WHERE timestamp >= NOW() - INTERVAL '${parseInt(hours)} hours'
        `;

        const params = [];
        if (crypto) {
            params.push(crypto);
            query += ` AND crypto_symbol = $1`;
        }

        query += ` ORDER BY timestamp DESC`;

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
                crypto_symbol, price_usd, market_cap, volume_24h, price_change_24h, timestamp
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

// Get XRP ETF flows from CoinGlass (real-time)
router.get('/xrp-etf-flows', async (req, res) => {
    try {
        const flows = await coinGlass.getXRPETFFlows();
        if (!flows) {
            return res.status(503).json({ error: 'CoinGlass API unavailable or upgrade required' });
        }

        // Transform data for frontend
        const transformedFlows = flows.map(flow => ({
            date: new Date(flow.timestamp).toISOString().split('T')[0],
            timestamp: flow.timestamp,
            net_flow: flow.flow_usd,
            price_usd: flow.price_usd,
            etf_breakdown: flow.etf_flows?.map(etf => ({
                ticker: etf.etf_ticker,
                flow_usd: etf.flow_usd || 0
            })) || []
        }));

        res.json(transformedFlows);
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

module.exports = router;
