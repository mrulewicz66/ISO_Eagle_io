const axios = require('axios');

class CoinGeckoService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.coingecko.com/api/v3';
        // Public API works without key (rate limited to ~10-30 calls/min)
        this.headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
    }

    async getTopCryptos() {
        const cryptoIds = [
            'bitcoin', 'ethereum', 'tether', 'ripple',
            'binancecoin', 'solana', 'usd-coin',
            'dogecoin', 'cardano', 'tron'
        ];

        try {
            const response = await axios.get(`${this.baseURL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: cryptoIds.join(','),
                    order: 'market_cap_desc',
                    sparkline: false
                },
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('CoinGecko API Error:', error.message);
            throw error;
        }
    }

    async getISO20022Cryptos() {
        const iso20022Ids = [
            'ripple', 'stellar', 'xdce-crowd-sale',
            'algorand', 'iota', 'hedera-hashgraph',
            'quant-network', 'cardano'
        ];

        try {
            const response = await axios.get(`${this.baseURL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: iso20022Ids.join(','),
                    sparkline: false
                },
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('CoinGecko API Error:', error.message);
            throw error;
        }
    }

    async getExchangeVolumes(exchangeId) {
        try {
            const response = await axios.get(
                `${this.baseURL}/exchanges/${exchangeId}`,
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('CoinGecko Exchange API Error:', error.message);
            throw error;
        }
    }
}

module.exports = CoinGeckoService;
