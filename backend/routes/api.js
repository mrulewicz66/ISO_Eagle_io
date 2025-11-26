const express = require('express');
const router = express.Router();
const db = require('../db/database');

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
                crypto_symbol, price_usd, market_cap, volume_24h, timestamp
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

module.exports = router;
