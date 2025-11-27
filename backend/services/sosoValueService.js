const axios = require('axios');
const https = require('https');

class SoSoValueService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.sosovalue.xyz';

        // Create axios instance with SSL handling for Windows compatibility
        this.client = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false  // Allow self-signed certificates
            })
        });

        // ETF types that work with the API
        // Note: XRP ETF data not yet available in API (as of Nov 2025)
        this.supportedTypes = {
            BTC: 'us-btc-spot',
            ETH: 'us-eth-spot',
            SOL: 'us-sol-spot',
            XRP: 'us-xrp-spot'  // Returns empty - API not updated yet
        };
    }

    async getETFHistoricalFlows(asset = 'XRP') {
        if (!this.apiKey) {
            console.log('SoSoValue API key not configured');
            return null;
        }

        const type = this.supportedTypes[asset.toUpperCase()] || `us-${asset.toLowerCase()}-spot`;

        try {
            const response = await this.client.post(
                `${this.baseURL}/openapi/v2/etf/historicalInflowChart`,
                { type },
                {
                    headers: {
                        'x-soso-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.code === 0 && response.data.data?.length > 0) {
                console.log(`SoSoValue: Fetched ${response.data.data.length} ${asset} ETF flow records`);
                return response.data.data;
            } else if (response.data.code === 0 && (!response.data.data || response.data.data.length === 0)) {
                console.log(`SoSoValue: ${asset} ETF data not available in API yet`);
                return [];
            } else {
                console.log(`SoSoValue ${asset} ETF response:`, response.data);
                return null;
            }
        } catch (error) {
            console.error(`SoSoValue ${asset} ETF API error:`, error.response?.data || error.message);
            return null;
        }
    }

    // Convenience methods for specific assets
    async getXRPETFFlows() {
        return this.getETFHistoricalFlows('XRP');
    }

    async getBTCETFFlows() {
        return this.getETFHistoricalFlows('BTC');
    }

    async getETHETFFlows() {
        return this.getETFHistoricalFlows('ETH');
    }

    async getSOLETFFlows() {
        return this.getETFHistoricalFlows('SOL');
    }

    // Get all available ETF flows
    async getAllETFFlows() {
        const results = {};

        for (const [asset, type] of Object.entries(this.supportedTypes)) {
            try {
                const data = await this.getETFHistoricalFlows(asset);
                if (data && data.length > 0) {
                    results[asset] = data;
                }
            } catch (error) {
                console.error(`Error fetching ${asset} ETF flows:`, error.message);
            }
        }

        return results;
    }

    // Test method to check what ETF types are available
    async testAvailableTypes() {
        const results = {};

        for (const [asset, type] of Object.entries(this.supportedTypes)) {
            try {
                const response = await this.client.post(
                    `${this.baseURL}/openapi/v2/etf/historicalInflowChart`,
                    { type },
                    {
                        headers: {
                            'x-soso-api-key': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                results[asset] = {
                    type,
                    success: response.data.code === 0,
                    records: response.data.data?.length || 0,
                    hasData: response.data.data?.length > 0
                };
            } catch (error) {
                results[asset] = {
                    type,
                    success: false,
                    error: error.response?.data?.msg || error.message
                };
            }
        }

        return results;
    }
}

module.exports = SoSoValueService;
