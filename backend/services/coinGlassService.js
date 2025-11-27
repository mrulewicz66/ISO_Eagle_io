const axios = require('axios');

class CoinGlassService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://open-api-v4.coinglass.com/api';
        this.headers = {
            'CG-API-KEY': apiKey,
            'Content-Type': 'application/json'
        };
    }

    // Check if API requires plan upgrade
    isUpgradeRequired(response) {
        return response?.data?.code === '400' && response?.data?.msg === 'Upgrade plan';
    }

    async getXRPETFFlows() {
        if (!this.apiKey) {
            console.log('CoinGlass API key not configured');
            return null;
        }

        try {
            const response = await axios.get(
                `${this.baseURL}/etf/xrp/flow-history`,
                { headers: this.headers }
            );

            if (this.isUpgradeRequired(response)) {
                console.log('CoinGlass: XRP ETF flows requires plan upgrade');
                return null;
            }

            if (response.data.code === '404') {
                console.log('CoinGlass: XRP ETF endpoint not yet available');
                return null;
            }

            return response.data.data || [];
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.code === '400' && errData?.msg === 'Upgrade plan') {
                console.log('CoinGlass: XRP ETF flows requires plan upgrade');
                return null;
            }
            if (errData?.code === '404') {
                console.log('CoinGlass: XRP ETF endpoint not yet available in API');
                return null;
            }
            console.error('CoinGlass XRP ETF Flows API Error:', error.message);
            return null;
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
        if (!this.apiKey) {
            console.log('CoinGlass API key not configured');
            return null;
        }

        try {
            // Try the balance list endpoint
            const response = await axios.get(
                `${this.baseURL}/exchange/balance/list`,
                {
                    params: { symbol: symbol.toUpperCase() },
                    headers: this.headers
                }
            );

            const errData = response.data;
            if (errData?.code === '400' && errData?.msg === 'Upgrade plan') {
                console.log(`CoinGlass: ${symbol} exchange balance requires plan upgrade ($18/mo Hobbyist)`);
                return null;
            }

            return response.data.data || [];
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.code === '400' && errData?.msg === 'Upgrade plan') {
                console.log(`CoinGlass: ${symbol} exchange balance requires plan upgrade ($18/mo Hobbyist)`);
                return null;
            }
            console.error('CoinGlass Exchange Balance API Error:', error.message);
            return null;
        }
    }

    async getXRPExchangeReserves() {
        return this.getExchangeBalance('XRP');
    }

    async getSpotInflow(symbol = 'XRP') {
        if (!this.apiKey) {
            console.log('CoinGlass API key not configured');
            return null;
        }

        try {
            const response = await axios.get(
                `${this.baseURL}/spot/exchange-inflow`,
                {
                    params: { symbol: symbol.toUpperCase() },
                    headers: this.headers
                }
            );

            const errData = response.data;
            if (errData?.code === '400' && errData?.msg === 'Upgrade plan') {
                console.log(`CoinGlass: ${symbol} spot inflow requires plan upgrade`);
                return null;
            }

            return response.data.data || [];
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.code === '400' && errData?.msg === 'Upgrade plan') {
                console.log(`CoinGlass: ${symbol} spot inflow requires plan upgrade`);
                return null;
            }
            console.error('CoinGlass Spot Inflow API Error:', error.message);
            return null;
        }
    }

    // Test which endpoints are available with current API key
    async testAvailableEndpoints() {
        const results = {
            xrpETFFlows: { available: false, reason: '' },
            xrpExchangeBalance: { available: false, reason: '' },
            btcETFFlows: { available: false, reason: '' }
        };

        try {
            const xrpETF = await this.getXRPETFFlows();
            results.xrpETFFlows = { available: xrpETF !== null, reason: xrpETF === null ? 'Not available or upgrade required' : 'OK' };
        } catch (e) {
            results.xrpETFFlows = { available: false, reason: e.message };
        }

        try {
            const xrpBalance = await this.getExchangeBalance('XRP');
            results.xrpExchangeBalance = { available: xrpBalance !== null, reason: xrpBalance === null ? 'Upgrade required' : 'OK' };
        } catch (e) {
            results.xrpExchangeBalance = { available: false, reason: e.message };
        }

        try {
            const btcETF = await this.getBTCETFFlows();
            results.btcETFFlows = { available: btcETF !== null, reason: btcETF === null ? 'Upgrade required' : 'OK' };
        } catch (e) {
            results.btcETFFlows = { available: false, reason: e.message };
        }

        return results;
    }
}

module.exports = CoinGlassService;
