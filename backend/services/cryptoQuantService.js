const axios = require('axios');

class CryptoQuantService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.cryptoquant.com/v1';
        this.headers = {
            'Authorization': `Bearer ${apiKey}`
        };
    }

    async getExchangeReserve(asset = 'xrp', exchange = 'all_exchange') {
        try {
            const response = await axios.get(
                `${this.baseURL}/xrp/exchange-flows/exchange-reserve`,
                {
                    params: {
                        exchange: exchange,
                        window: 'day',
                        limit: 30
                    },
                    headers: this.headers
                }
            );
            return response.data.result?.data || [];
        } catch (error) {
            console.error('CryptoQuant Exchange Reserve API Error:', error.message);
            throw error;
        }
    }

    async getExchangeReserveByExchange(exchange) {
        const exchanges = ['binance', 'coinbase', 'kraken', 'upbit', 'bybit', 'okx'];

        if (exchange && exchanges.includes(exchange.toLowerCase())) {
            return this.getExchangeReserve('xrp', exchange.toLowerCase());
        }

        try {
            const results = await Promise.allSettled(
                exchanges.map(ex => this.getExchangeReserve('xrp', ex))
            );

            const exchangeData = {};
            exchanges.forEach((ex, idx) => {
                if (results[idx].status === 'fulfilled') {
                    exchangeData[ex] = results[idx].value;
                }
            });

            return exchangeData;
        } catch (error) {
            console.error('CryptoQuant Multi-Exchange API Error:', error.message);
            throw error;
        }
    }

    async getExchangeInflow(asset = 'xrp') {
        try {
            const response = await axios.get(
                `${this.baseURL}/xrp/exchange-flows/exchange-inflow`,
                {
                    params: {
                        window: 'day',
                        limit: 30
                    },
                    headers: this.headers
                }
            );
            return response.data.result?.data || [];
        } catch (error) {
            console.error('CryptoQuant Exchange Inflow API Error:', error.message);
            throw error;
        }
    }

    async getExchangeOutflow(asset = 'xrp') {
        try {
            const response = await axios.get(
                `${this.baseURL}/xrp/exchange-flows/exchange-outflow`,
                {
                    params: {
                        window: 'day',
                        limit: 30
                    },
                    headers: this.headers
                }
            );
            return response.data.result?.data || [];
        } catch (error) {
            console.error('CryptoQuant Exchange Outflow API Error:', error.message);
            throw error;
        }
    }

    async getExchangeNetflow(asset = 'xrp') {
        try {
            const response = await axios.get(
                `${this.baseURL}/xrp/exchange-flows/exchange-netflow`,
                {
                    params: {
                        window: 'day',
                        limit: 30
                    },
                    headers: this.headers
                }
            );
            return response.data.result?.data || [];
        } catch (error) {
            console.error('CryptoQuant Exchange Netflow API Error:', error.message);
            throw error;
        }
    }

    async getXRPExchangeSummary() {
        try {
            const [reserve, inflow, outflow, netflow] = await Promise.allSettled([
                this.getExchangeReserve('xrp'),
                this.getExchangeInflow('xrp'),
                this.getExchangeOutflow('xrp'),
                this.getExchangeNetflow('xrp')
            ]);

            return {
                reserve: reserve.status === 'fulfilled' ? reserve.value : null,
                inflow: inflow.status === 'fulfilled' ? inflow.value : null,
                outflow: outflow.status === 'fulfilled' ? outflow.value : null,
                netflow: netflow.status === 'fulfilled' ? netflow.value : null
            };
        } catch (error) {
            console.error('CryptoQuant XRP Summary Error:', error.message);
            throw error;
        }
    }
}

module.exports = CryptoQuantService;
