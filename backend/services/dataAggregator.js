const CoinGeckoService = require('./coinGeckoService');
const CoinGlassService = require('./coinGlassService');
const CryptoQuantService = require('./cryptoQuantService');
const db = require('../db/database');

class DataAggregator {
    constructor() {
        this.coinGecko = new CoinGeckoService(process.env.COINGECKO_API_KEY);
        this.coinGlass = new CoinGlassService(process.env.COINGLASS_API_KEY);
        this.cryptoQuant = new CryptoQuantService(process.env.CRYPTOQUANT_API_KEY);
    }

    async aggregateAllData() {
        try {
            // Fetch XRP-focused data in parallel
            const [
                iso20022Cryptos,
                topCryptos,
                // XRP ETF flows from CoinGlass
                xrpETFFlows,
                // XRP exchange supply from CryptoQuant
                xrpExchangeReserve,
                xrpExchangeByExchange
            ] = await Promise.allSettled([
                this.coinGecko.getISO20022Cryptos(),
                this.coinGecko.getTopCryptos(),
                this.coinGlass.getETFFlows('XRP'),
                this.cryptoQuant.getExchangeReserve('xrp'),
                this.cryptoQuant.getExchangeReserveByExchange()
            ]);

            // Process and store price data
            if (iso20022Cryptos.status === 'fulfilled') {
                await this.storePriceData(iso20022Cryptos.value);
            }
            if (topCryptos.status === 'fulfilled') {
                await this.storePriceData(topCryptos.value);
            }

            // XRP ETF Flows (from CoinGlass)
            if (xrpETFFlows.status === 'fulfilled') {
                await this.storeETFFlowsCoinGlass(xrpETFFlows.value, 'XRP');
            }

            // XRP Exchange reserves (from CryptoQuant)
            if (xrpExchangeReserve.status === 'fulfilled') {
                await this.storeExchangeReservesCryptoQuant(xrpExchangeReserve.value, 'XRP');
            }
            if (xrpExchangeByExchange.status === 'fulfilled') {
                await this.storeExchangeReservesByExchange(xrpExchangeByExchange.value, 'XRP');
            }

            return {
                success: true,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Data Aggregation Error:', error);
            throw error;
        }
    }

    async storePriceData(cryptoData) {
        if (!cryptoData) return;

        for (const crypto of cryptoData) {
            try {
                await db.query(`
                    INSERT INTO price_data (timestamp, crypto_symbol, price_usd, market_cap, volume_24h)
                    VALUES (NOW(), $1, $2, $3, $4)
                    ON CONFLICT (timestamp, crypto_symbol) DO UPDATE
                    SET price_usd = $2, market_cap = $3, volume_24h = $4
                `, [crypto.symbol.toUpperCase(), crypto.current_price, crypto.market_cap, crypto.total_volume]);
            } catch (err) {
                console.error(`Error storing price data for ${crypto.symbol}:`, err.message);
            }
        }
    }

    async storeETFFlows(flowData, asset) {
        if (!flowData) return;

        for (const flow of flowData) {
            try {
                await db.query(`
                    INSERT INTO etf_flows (date, asset, net_flow)
                    VALUES (to_timestamp($1), $2, $3)
                    ON CONFLICT (date, asset, etf_name) DO UPDATE
                    SET net_flow = $3
                `, [flow.t, asset, flow.v]);
            } catch (err) {
                console.error(`Error storing ETF flow for ${asset}:`, err.message);
            }
        }
    }

    async storeExchangeReserves(reserveData, crypto) {
        if (!reserveData) return;

        for (const reserve of reserveData) {
            try {
                await db.query(`
                    INSERT INTO exchange_reserves (timestamp, crypto_symbol, balance)
                    VALUES (to_timestamp($1), $2, $3)
                    ON CONFLICT DO NOTHING
                `, [reserve.t, crypto, reserve.v]);
            } catch (err) {
                console.error(`Error storing exchange reserve for ${crypto}:`, err.message);
            }
        }
    }

    async storeETFFlowsCoinGlass(flowData, asset) {
        if (!flowData || !Array.isArray(flowData)) return;

        for (const flow of flowData) {
            try {
                // CoinGlass format: { date, totalNetFlow, price, etfList: [{ticker, netFlow}] }
                const timestamp = flow.date || flow.timestamp;
                const netFlow = flow.totalNetFlow || flow.netFlow || flow.flow;

                await db.query(`
                    INSERT INTO etf_flows (date, asset, net_flow, etf_name, source)
                    VALUES (to_timestamp($1 / 1000), $2, $3, $4, 'coinglass')
                    ON CONFLICT (date, asset, etf_name) DO UPDATE
                    SET net_flow = $3
                `, [timestamp, asset, netFlow, 'TOTAL']);

                // Store individual ETF flows if available
                if (flow.etfList && Array.isArray(flow.etfList)) {
                    for (const etf of flow.etfList) {
                        await db.query(`
                            INSERT INTO etf_flows (date, asset, net_flow, etf_name, source)
                            VALUES (to_timestamp($1 / 1000), $2, $3, $4, 'coinglass')
                            ON CONFLICT (date, asset, etf_name) DO UPDATE
                            SET net_flow = $3
                        `, [timestamp, asset, etf.netFlow, etf.ticker]);
                    }
                }
            } catch (err) {
                console.error(`Error storing CoinGlass ETF flow for ${asset}:`, err.message);
            }
        }
    }

    async storeExchangeReservesCryptoQuant(reserveData, crypto) {
        if (!reserveData || !Array.isArray(reserveData)) return;

        for (const reserve of reserveData) {
            try {
                // CryptoQuant format: { datetime, value } or { date, reserve }
                const timestamp = reserve.datetime || reserve.date;
                const balance = reserve.value || reserve.reserve;

                await db.query(`
                    INSERT INTO exchange_reserves (timestamp, crypto_symbol, balance, exchange_name, source)
                    VALUES ($1, $2, $3, $4, 'cryptoquant')
                    ON CONFLICT DO NOTHING
                `, [new Date(timestamp), crypto, balance, 'aggregated']);
            } catch (err) {
                console.error(`Error storing CryptoQuant reserve for ${crypto}:`, err.message);
            }
        }
    }

    async storeExchangeReservesByExchange(exchangeData, crypto) {
        if (!exchangeData || typeof exchangeData !== 'object') return;

        for (const [exchangeName, reserves] of Object.entries(exchangeData)) {
            if (!reserves || !Array.isArray(reserves)) continue;

            for (const reserve of reserves) {
                try {
                    const timestamp = reserve.datetime || reserve.date;
                    const balance = reserve.value || reserve.reserve;

                    await db.query(`
                        INSERT INTO exchange_reserves (timestamp, crypto_symbol, balance, exchange_name, source)
                        VALUES ($1, $2, $3, $4, 'cryptoquant')
                        ON CONFLICT DO NOTHING
                    `, [new Date(timestamp), crypto, balance, exchangeName]);
                } catch (err) {
                    console.error(`Error storing ${exchangeName} reserve for ${crypto}:`, err.message);
                }
            }
        }
    }
}

module.exports = DataAggregator;
