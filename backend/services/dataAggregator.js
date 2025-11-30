const CoinGeckoService = require('./coinGeckoService');
const CoinGlassService = require('./coinGlassService');
const CryptoQuantService = require('./cryptoQuantService');
const SoSoValueService = require('./sosoValueService');
const db = require('../db/database');

class DataAggregator {
    constructor() {
        this.coinGecko = new CoinGeckoService(process.env.COINGECKO_API_KEY);
        this.coinGlass = new CoinGlassService(process.env.COINGLASS_API_KEY);
        this.cryptoQuant = new CryptoQuantService(process.env.CRYPTOQUANT_API_KEY);
        this.sosoValue = new SoSoValueService(process.env.SOSOVALUE_API_KEY);

        // Log API status on startup
        this.logAPIStatus();
    }

    logAPIStatus() {
        console.log('\n=== API Configuration Status ===');
        console.log('CoinGecko API: Using FREE public API (price data)');
        console.log('SoSoValue API:', process.env.SOSOVALUE_API_KEY ? 'Configured (BTC/ETH/SOL ETF flows - XRP pending in API)' : 'Not configured');
        console.log('CoinGlass API:', process.env.COINGLASS_API_KEY ? 'Configured (XRP exchange balance requires $18/mo upgrade)' : 'Not configured');
        console.log('CryptoQuant API:', process.env.CRYPTOQUANT_API_KEY ? 'Configured' : 'Not configured ($99/mo for API access)');
        console.log('================================\n');
    }

    async aggregateAllData() {
        try {
            const results = {
                success: true,
                timestamp: new Date(),
                fetched: [],
                skipped: []
            };

            // CoinGecko FREE public API - price data for top cryptos & ISO 20022 tokens
            console.log('Fetching price data from CoinGecko (free public API)...');
            const [iso20022Cryptos, topCryptos] = await Promise.allSettled([
                this.coinGecko.getISO20022Cryptos(),
                this.coinGecko.getTopCryptos()
            ]);

            if (iso20022Cryptos.status === 'fulfilled') {
                await this.storePriceData(iso20022Cryptos.value);
                results.fetched.push('iso20022Prices');
                console.log(`  - ISO 20022 tokens: ${iso20022Cryptos.value?.length || 0} coins`);
            } else {
                console.log('  - ISO 20022 fetch failed:', iso20022Cryptos.reason?.message);
            }

            if (topCryptos.status === 'fulfilled') {
                await this.storePriceData(topCryptos.value);
                results.fetched.push('topCryptoPrices');
                console.log(`  - Top cryptos: ${topCryptos.value?.length || 0} coins`);
            } else {
                console.log('  - Top cryptos fetch failed:', topCryptos.reason?.message);
            }

            // SoSoValue API - ETF Flows (BTC, ETH, SOL available; XRP pending)
            if (process.env.SOSOVALUE_API_KEY) {
                console.log('Fetching ETF flows from SoSoValue...');
                try {
                    // Fetch all available ETF flows
                    const etfFlows = await this.sosoValue.getAllETFFlows();

                    for (const [asset, flows] of Object.entries(etfFlows)) {
                        if (flows && flows.length > 0) {
                            await this.storeETFFlowsSoSoValue(flows, asset);
                            results.fetched.push(`${asset}ETFFlows`);
                            console.log(`  - ${asset} ETF flows: ${flows.length} days`);
                        }
                    }

                    // Also try XRP specifically (will return empty until API updated)
                    const xrpFlows = await this.sosoValue.getXRPETFFlows();
                    if (xrpFlows && xrpFlows.length > 0) {
                        await this.storeETFFlowsSoSoValue(xrpFlows, 'XRP');
                        results.fetched.push('XRPETFFlows');
                        console.log(`  - XRP ETF flows: ${xrpFlows.length} days`);
                    } else {
                        console.log('  - XRP ETF: Not yet available in SoSoValue API');
                    }
                } catch (error) {
                    console.error('  - SoSoValue ETF flows error:', error.message);
                }
            }

            // CoinGlass API - XRP ETF Flows and Exchange Reserves
            if (process.env.COINGLASS_API_KEY) {
                console.log('Fetching XRP data from CoinGlass...');

                // Try XRP ETF Flows (requires paid plan + API endpoint to be live)
                try {
                    const xrpETFFlows = await this.coinGlass.getXRPETFFlows();
                    if (xrpETFFlows && xrpETFFlows.length > 0) {
                        await this.storeETFFlowsCoinGlass(xrpETFFlows, 'XRP');
                        results.fetched.push('XRPETFFlowsCoinGlass');
                        console.log(`  - XRP ETF flows (CoinGlass): ${xrpETFFlows.length} records`);
                    } else {
                        console.log('  - XRP ETF flows: API endpoint not yet available');
                    }
                } catch (error) {
                    console.log('  - XRP ETF flows: Not available -', error.message);
                }

                // Try XRP Exchange Reserves (requires $18/mo Hobbyist plan)
                try {
                    const xrpReserves = await this.coinGlass.getXRPExchangeReserves();
                    if (xrpReserves && xrpReserves.length > 0) {
                        await this.storeExchangeReservesCoinGlass(xrpReserves, 'XRP');
                        results.fetched.push('XRPExchangeReserves');
                        console.log(`  - XRP exchange reserves (CoinGlass): ${xrpReserves.length} exchanges`);
                    } else {
                        console.log('  - XRP exchange reserves: Requires CoinGlass Hobbyist plan ($18/mo)');
                    }
                } catch (error) {
                    console.log('  - XRP exchange reserves: Not available -', error.message);
                }
            }

            // DISABLED: CryptoQuant (requires $99/mo Professional plan for API)
            results.skipped = ['cryptoQuant'];

            return results;
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
                    INSERT INTO price_data (timestamp, crypto_symbol, price_usd, market_cap, volume_24h, price_change_24h, price_change_7d)
                    VALUES (NOW(), $1, $2, $3, $4, $5, $6)
                    ON CONFLICT (timestamp, crypto_symbol) DO UPDATE
                    SET price_usd = $2, market_cap = $3, volume_24h = $4, price_change_24h = $5, price_change_7d = $6
                `, [crypto.symbol.toUpperCase(), crypto.current_price, crypto.market_cap, crypto.total_volume, crypto.price_change_percentage_24h, crypto.price_change_percentage_7d_in_currency || null]);
            } catch (err) {
                console.error(`Error storing price data for ${crypto.symbol}:`, err.code || err.message || err);
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
                // CoinGlass format: { timestamp (ms), flow_usd, price_usd, etf_flows: [{etf_ticker, flow_usd}] }
                const timestamp = flow.timestamp;
                const netFlow = flow.flow_usd;
                // Convert milliseconds timestamp to date string
                const dateStr = new Date(timestamp).toISOString().split('T')[0];

                await db.query(`
                    INSERT INTO etf_flows (date, asset, net_flow, etf_name, source)
                    VALUES ($1, $2, $3, $4, 'coinglass')
                    ON CONFLICT (date, asset, etf_name) DO UPDATE
                    SET net_flow = $3
                `, [dateStr, asset, netFlow, 'TOTAL']);

                // Store individual ETF flows if available (CoinGlass uses etf_flows)
                const etfList = flow.etf_flows || flow.etfList;
                if (etfList && Array.isArray(etfList)) {
                    for (const etf of etfList) {
                        const etfFlow = etf.flow_usd || etf.netFlow || 0;
                        const etfTicker = etf.etf_ticker || etf.ticker;
                        if (etfFlow > 0) {
                            await db.query(`
                                INSERT INTO etf_flows (date, asset, net_flow, etf_name, source)
                                VALUES ($1, $2, $3, $4, 'coinglass')
                                ON CONFLICT (date, asset, etf_name) DO UPDATE
                                SET net_flow = $3
                            `, [dateStr, asset, etfFlow, etfTicker]);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error storing CoinGlass ETF flow for ${asset}:`, err.message);
            }
        }
    }

    async storeETFFlowsSoSoValue(flowData, asset) {
        if (!flowData || !Array.isArray(flowData)) return;

        for (const flow of flowData) {
            try {
                // SoSoValue format: { date: "YYYY-MM-DD", totalNetInflow, totalValueTraded, totalNetAssets, cumNetInflow }
                const date = flow.date;
                const netFlow = flow.totalNetInflow;
                const totalAssets = flow.totalNetAssets;

                await db.query(`
                    INSERT INTO etf_flows (date, asset, net_flow, total_holdings, etf_name, source)
                    VALUES ($1, $2, $3, $4, $5, 'sosovalue')
                    ON CONFLICT (date, asset, etf_name) DO UPDATE
                    SET net_flow = $3, total_holdings = $4
                `, [date, asset, netFlow, totalAssets, 'TOTAL']);
            } catch (err) {
                console.error(`Error storing SoSoValue ETF flow for ${asset}:`, err.code || err.message || err);
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

    async storeExchangeReservesCoinGlass(reserveData, crypto) {
        if (!reserveData || !Array.isArray(reserveData)) return;

        for (const reserve of reserveData) {
            try {
                // CoinGlass format: { exchange, balance, balanceUsd, ... }
                const exchangeName = reserve.exchange || reserve.exchangeName || 'unknown';
                const balance = reserve.balance || reserve.value || 0;

                await db.query(`
                    INSERT INTO exchange_reserves (timestamp, crypto_symbol, balance, exchange_name, source)
                    VALUES (NOW(), $1, $2, $3, 'coinglass')
                    ON CONFLICT DO NOTHING
                `, [crypto, balance, exchangeName]);
            } catch (err) {
                console.error(`Error storing CoinGlass reserve for ${crypto}:`, err.message);
            }
        }
    }
}

module.exports = DataAggregator;
