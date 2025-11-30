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
                    sparkline: false,
                    price_change_percentage: '7d'
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
                    sparkline: false,
                    price_change_percentage: '7d'
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

    // Get 7-day historical volume for a coin
    async get7dVolume(coinId = 'ripple') {
        try {
            const response = await axios.get(`${this.baseURL}/coins/${coinId}/market_chart`, {
                params: {
                    vs_currency: 'usd',
                    days: 7,
                    interval: 'daily'
                },
                headers: this.headers
            });

            // total_volumes is an array of [timestamp, volume]
            const volumes = response.data.total_volumes || [];
            // Sum all daily volumes
            const totalVolume = volumes.reduce((sum, [, vol]) => sum + vol, 0);
            return totalVolume;
        } catch (error) {
            console.error('CoinGecko 7d Volume Error:', error.message);
            return null;
        }
    }
}

module.exports = CoinGeckoService;
