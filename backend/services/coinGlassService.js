const axios = require('axios');

class CoinGlassService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://open-api-v3.coinglass.com/api';
        this.headers = {
            'CG-API-KEY': apiKey,
            'Content-Type': 'application/json'
        };
    }

    async getXRPETFFlows() {
        try {
            const response = await axios.get(
                `${this.baseURL}/etf/xrp/flows-history`,
                { headers: this.headers }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass XRP ETF Flows API Error:', error.message);
            throw error;
        }
    }

    async getBTCETFFlows() {
        try {
            const response = await axios.get(
                `${this.baseURL}/etf/btc/flows-history`,
                { headers: this.headers }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass BTC ETF Flows API Error:', error.message);
            throw error;
        }
    }

    async getETHETFFlows() {
        try {
            const response = await axios.get(
                `${this.baseURL}/etf/eth/flows-history`,
                { headers: this.headers }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass ETH ETF Flows API Error:', error.message);
            throw error;
        }
    }

    async getSOLETFFlows() {
        try {
            const response = await axios.get(
                `${this.baseURL}/etf/sol/flows-history`,
                { headers: this.headers }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass SOL ETF Flows API Error:', error.message);
            throw error;
        }
    }

    async getETFFlows(asset = 'XRP') {
        const assetLower = asset.toLowerCase();
        switch (assetLower) {
            case 'xrp':
                return this.getXRPETFFlows();
            case 'btc':
            case 'bitcoin':
                return this.getBTCETFFlows();
            case 'eth':
            case 'ethereum':
                return this.getETHETFFlows();
            case 'sol':
            case 'solana':
                return this.getSOLETFFlows();
            default:
                throw new Error(`ETF flows not available for asset: ${asset}`);
        }
    }

    async getAllETFFlows() {
        try {
            const [xrp, btc, eth, sol] = await Promise.allSettled([
                this.getXRPETFFlows(),
                this.getBTCETFFlows(),
                this.getETHETFFlows(),
                this.getSOLETFFlows()
            ]);

            return {
                XRP: xrp.status === 'fulfilled' ? xrp.value : null,
                BTC: btc.status === 'fulfilled' ? btc.value : null,
                ETH: eth.status === 'fulfilled' ? eth.value : null,
                SOL: sol.status === 'fulfilled' ? sol.value : null
            };
        } catch (error) {
            console.error('CoinGlass All ETF Flows Error:', error.message);
            throw error;
        }
    }

    async getExchangeBalance(symbol = 'XRP') {
        try {
            const response = await axios.get(
                `${this.baseURL}/exchange/balance`,
                {
                    params: { symbol: symbol.toUpperCase() },
                    headers: this.headers
                }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass Exchange Balance API Error:', error.message);
            throw error;
        }
    }

    async getSpotInflow(symbol = 'XRP') {
        try {
            const response = await axios.get(
                `${this.baseURL}/spot/exchange-inflow`,
                {
                    params: { symbol: symbol.toUpperCase() },
                    headers: this.headers
                }
            );
            return response.data.data || [];
        } catch (error) {
            console.error('CoinGlass Spot Inflow API Error:', error.message);
            throw error;
        }
    }
}

module.exports = CoinGlassService;
