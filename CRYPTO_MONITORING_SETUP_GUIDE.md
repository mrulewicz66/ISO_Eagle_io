# Crypto ETF & Exchange Supply Monitoring Website - Complete Setup Guide

## Project Overview

This guide details how to build a real-time monitoring website that tracks:
- **Crypto ETF inflows and outflows** (Bitcoin, Ethereum, Solana ETFs)
- **Exchange supply/reserves** for:
  - Top 10 cryptocurrencies by market cap
  - All ISO 20022 compliant cryptocurrencies

---

## 1. Cryptocurrencies to Track

### Top 10 by Market Cap (November 2025)
1. Bitcoin (BTC)
2. Ethereum (ETH)
3. Tether (USDT)
4. XRP
5. BNB (Binance Coin)
6. Solana (SOL)
7. USDC
8. Dogecoin (DOGE)
9. Cardano (ADA)
10. TRON (TRX)

### ISO 20022 Compliant Cryptocurrencies
1. **XRP** (Ripple)
2. **XLM** (Stellar Lumens)
3. **XDC** (XDC Network)
4. **ALGO** (Algorand)
5. **IOTA**
6. **HBAR** (Hedera Hashgraph)
7. **QNT** (Quant)
8. **ADA** (Cardano)

**Note:** ADA and XRP appear in both lists.

---

## 2. Data Sources & API Recommendations

### A. ETF Inflow/Outflow Data

#### **Primary Option: CoinGlass API**
- **Website:** https://www.coinglass.com
- **Features:**
  - Bitcoin ETF flows (daily inflows/outflows)
  - Ethereum ETF flows
  - Trading volumes, market cap, holdings
  - Historical data
- **API Access:** Check their API documentation for endpoints
- **Pricing:** Contact for API pricing

#### **Alternative: Glassnode API**
- **Website:** https://glassnode.com
- **Features:**
  - US Spot ETF Net Flows for BTC
  - 800+ on-chain metrics
  - Institutional-grade data
- **API Endpoint Example:** `/v1/metrics/institutions/usSpotEtfFlowsNet`
- **Pricing:**
  - Free tier: Limited metrics
  - Advanced: $29-$799/month
  - Professional: $799+/month
- **Documentation:** https://docs.glassnode.com

#### **Alternative: Dune Analytics**
- **Website:** https://dune.com
- **Features:**
  - Custom SQL queries on blockchain data
  - Bitcoin/Ethereum ETF dashboards
  - API access to query results
- **API Access:** Dune API for programmatic access
- **Pricing:**
  - Free tier available
  - Premium: $390/month
  - Enterprise: Custom pricing

#### **Alternative: SoSoValue**
- **Website:** https://m.sosovalue.com/assets/etf/us-btc-spot
- **Features:**
  - Comprehensive ETF dashboard
  - Real-time BTC/ETH ETF data
  - Net inflows/outflows
- **API:** Check if they offer API access (primarily dashboard-based)

### B. Exchange Supply/Reserve Data

#### **Primary Option: Glassnode API**
- **Best for:** On-chain metrics and exchange reserves
- **Key Metrics:**
  - `exchange_net_position_change` - Net change in exchange reserves
  - `exchange_balance` - Total balance on exchanges
  - `inflow_exchanges_sum` - Total inflows to exchanges
  - `outflow_exchanges_sum` - Total outflows from exchanges
- **Coverage:** BTC, ETH, and major altcoins
- **Real-time:** Updates every 10 minutes to 24 hours depending on metric
- **Pricing:** $29-$799+/month depending on tier

#### **Secondary Option: CoinGecko API**
- **Website:** https://www.coingecko.com/en/api
- **Features:**
  - Real-time and historical prices
  - Exchange volumes
  - Market data for 1000+ exchanges
  - Comprehensive coin data
- **API Endpoint Examples:**
  - `/coins/markets` - Market data
  - `/exchanges/{id}/volume_chart` - Exchange volume
  - `/coins/{id}` - Detailed coin data
- **Pricing:**
  - Demo: Free (30 calls/min)
  - Analyst: $129/month (500 calls/min)
  - Pro: $499/month (1000 calls/min)
  - Enterprise: Custom pricing
- **Documentation:** https://docs.coingecko.com

#### **Tertiary Option: CoinMarketCap API**
- **Website:** https://coinmarketcap.com/api/
- **Features:**
  - Similar to CoinGecko
  - Cryptocurrency market data
  - Exchange data
- **Pricing:**
  - Basic: Free (333 calls/day)
  - Hobbyist: $29/month (10,000 calls/month)
  - Startup: $79/month (60,000 calls/month)
  - Professional+: $499+/month

### C. General Market Data

#### **CryptoCompare API**
- **Website:** https://www.cryptocompare.com/api/
- **Features:**
  - Real-time and historical prices
  - Social data
  - News aggregation
- **Pricing:** Free tier available, paid plans from $50/month

#### **Messari API**
- **Website:** https://messari.io/api
- **Features:**
  - Curated crypto research data
  - Market metrics
  - On-chain data
- **Pricing:** Free tier available, pro plans from $25/month

---

## 3. Recommended API Stack

### For Maximum Coverage

| Data Type | Primary API | Backup API | Update Frequency |
|-----------|-------------|------------|------------------|
| ETF Flows | CoinGlass | Glassnode | Daily (end of day) |
| Exchange Reserves (On-chain) | Glassnode | - | 10 min - 1 hour |
| Price Data | CoinGecko | CoinMarketCap | Real-time (1-60s) |
| Exchange Volumes | CoinGecko | CoinMarketCap | 1-5 minutes |
| Historical Data | Glassnode | Dune Analytics | As needed |

### Budget-Conscious Stack
- **Free Tier:** CoinGecko (Demo) + CoinMarketCap (Basic) + Dune Analytics (Free)
- **Mid-Tier (~$150-200/month):** CoinGecko Analyst + CoinGlass + Glassnode Advanced
- **Professional (~$1000+/month):** Glassnode Professional + CoinGecko Pro + Dune Premium

---

## 4. Technical Architecture

### Recommended Tech Stack

#### **Frontend**
- **Framework:** React.js or Next.js
- **Charting Library:**
  - TradingView Lightweight Charts
  - Recharts
  - Chart.js
- **UI Components:**
  - Tailwind CSS
  - shadcn/ui
  - Material-UI
- **Real-time Updates:**
  - Socket.io (for WebSocket connections)
  - React Query (for data fetching)

#### **Backend**
- **Framework:**
  - Node.js + Express
  - Python + FastAPI
  - Go + Gin (for high performance)
- **Database:**
  - PostgreSQL (time-series data)
  - TimescaleDB (optimized for time-series)
  - MongoDB (flexible schema)
  - Redis (caching layer)
- **Job Scheduler:**
  - Node-cron
  - Bull Queue (for job processing)
  - Celery (if using Python)

#### **Infrastructure**
- **Hosting:**
  - Vercel/Netlify (Frontend)
  - Railway/Render/DigitalOcean (Backend)
  - AWS/GCP (Enterprise)
- **Monitoring:**
  - Sentry (error tracking)
  - DataDog/Grafana (metrics)

---

## 5. System Architecture Diagram

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│  - Real-time Dashboard                  │
│  - Charts & Visualizations              │
│  - WebSocket Client                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Backend API (Node.js/Python)       │
│  - REST API Endpoints                   │
│  - WebSocket Server                     │
│  - Data Aggregation Layer               │
└────────┬────────────────────────────────┘
         │
         ├──────────────┬──────────────┬───────────────┐
         ▼              ▼              ▼               ▼
   ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐
   │CoinGlass │  │ Glassnode │  │ CoinGecko│  │  Dune   │
   │   API    │  │    API    │  │   API    │  │Analytics│
   └──────────┘  └───────────┘  └──────────┘  └─────────┘
         │              │              │               │
         └──────────────┴──────────────┴───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL DB   │
                    │  + Redis Cache   │
                    └──────────────────┘
```

---

## 6. Step-by-Step Setup Guide

### Phase 1: Setup & Configuration (Week 1)

#### Step 1: Initialize Project
```bash
# Create project directory
mkdir crypto-monitor
cd crypto-monitor

# Initialize frontend
npx create-next-app@latest frontend
cd frontend
npm install axios swr recharts tailwindcss socket.io-client

# Initialize backend
cd ..
mkdir backend
cd backend
npm init -y
npm install express axios node-cron dotenv pg redis bull socket.io cors
```

#### Step 2: Obtain API Keys
1. **CoinGecko**
   - Sign up at https://www.coingecko.com/en/api/pricing
   - Get API key from dashboard
   - Start with Demo (free) tier

2. **Glassnode**
   - Sign up at https://studio.glassnode.com
   - Navigate to Settings > API
   - Generate API key
   - Start with free tier or choose plan

3. **CoinGlass**
   - Contact CoinGlass for API access
   - Alternative: Scrape their public endpoints (check ToS)

4. **Dune Analytics** (Optional)
   - Sign up at https://dune.com
   - Create API key in account settings

#### Step 3: Setup Environment Variables
Create `.env` file in backend:
```bash
# API Keys
COINGECKO_API_KEY=your_key_here
GLASSNODE_API_KEY=your_key_here
COINGLASS_API_KEY=your_key_here
DUNE_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crypto_monitor
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development
```

### Phase 2: Backend Development (Week 2-3)

#### Step 4: Database Schema
```sql
-- Create tables for storing data

-- ETF Flows
CREATE TABLE etf_flows (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    asset VARCHAR(10) NOT NULL, -- BTC, ETH, SOL
    etf_name VARCHAR(100),
    inflow DECIMAL(20, 8),
    outflow DECIMAL(20, 8),
    net_flow DECIMAL(20, 8),
    total_holdings DECIMAL(20, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, asset, etf_name)
);

-- Exchange Reserves
CREATE TABLE exchange_reserves (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    exchange_name VARCHAR(50),
    balance DECIMAL(30, 8),
    inflow_24h DECIMAL(30, 8),
    outflow_24h DECIMAL(30, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(timestamp, crypto_symbol, exchange_name)
);

-- Price Data (for reference)
CREATE TABLE price_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    price_usd DECIMAL(20, 8),
    market_cap DECIMAL(30, 2),
    volume_24h DECIMAL(30, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(timestamp, crypto_symbol)
);

-- Create indexes for performance
CREATE INDEX idx_etf_flows_date ON etf_flows(date);
CREATE INDEX idx_etf_flows_asset ON etf_flows(asset);
CREATE INDEX idx_exchange_reserves_timestamp ON exchange_reserves(timestamp);
CREATE INDEX idx_exchange_reserves_crypto ON exchange_reserves(crypto_symbol);
CREATE INDEX idx_price_data_timestamp ON price_data(timestamp);
```

#### Step 5: Create API Service Modules

**backend/services/coinGeckoService.js**
```javascript
const axios = require('axios');

class CoinGeckoService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.headers = {
            'x-cg-demo-api-key': apiKey
        };
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
```

**backend/services/glassnodeService.js**
```javascript
const axios = require('axios');

class GlassnodeService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.glassnode.com';
    }

    async getETFFlows(asset = 'BTC') {
        try {
            const response = await axios.get(
                `${this.baseURL}/v1/metrics/institutions/usSpotEtfFlowsNet`,
                {
                    params: {
                        a: asset,
                        api_key: this.apiKey,
                        s: Math.floor(Date.now() / 1000) - (30 * 86400), // Last 30 days
                        i: '24h'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Glassnode ETF API Error:', error.message);
            throw error;
        }
    }

    async getExchangeBalance(asset, exchange = 'aggregated') {
        try {
            const response = await axios.get(
                `${this.baseURL}/v1/metrics/distribution/balance_exchanges`,
                {
                    params: {
                        a: asset,
                        api_key: this.apiKey,
                        i: '1h',
                        e: exchange
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Glassnode Exchange Balance API Error:', error.message);
            throw error;
        }
    }

    async getExchangeNetPosition(asset) {
        try {
            const response = await axios.get(
                `${this.baseURL}/v1/metrics/transactions/transfers_volume_exchanges_net`,
                {
                    params: {
                        a: asset,
                        api_key: this.apiKey,
                        i: '1h'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Glassnode Net Position API Error:', error.message);
            throw error;
        }
    }
}

module.exports = GlassnodeService;
```

**backend/services/dataAggregator.js**
```javascript
const CoinGeckoService = require('./coinGeckoService');
const GlassnodeService = require('./glassnodeService');
const db = require('../db/database');

class DataAggregator {
    constructor() {
        this.coinGecko = new CoinGeckoService(process.env.COINGECKO_API_KEY);
        this.glassnode = new GlassnodeService(process.env.GLASSNODE_API_KEY);
    }

    async aggregateAllData() {
        try {
            // Fetch all data in parallel
            const [
                topCryptos,
                iso20022Cryptos,
                btcETFFlows,
                ethETFFlows,
                btcExchangeBalance,
                ethExchangeBalance
            ] = await Promise.allSettled([
                this.coinGecko.getTopCryptos(),
                this.coinGecko.getISO20022Cryptos(),
                this.glassnode.getETFFlows('BTC'),
                this.glassnode.getETFFlows('ETH'),
                this.glassnode.getExchangeBalance('BTC'),
                this.glassnode.getExchangeBalance('ETH')
            ]);

            // Process and store data
            await this.storePriceData(topCryptos.value);
            await this.storePriceData(iso20022Cryptos.value);
            await this.storeETFFlows(btcETFFlows.value, 'BTC');
            await this.storeETFFlows(ethETFFlows.value, 'ETH');
            await this.storeExchangeReserves(btcExchangeBalance.value, 'BTC');
            await this.storeExchangeReserves(ethExchangeBalance.value, 'ETH');

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
            await db.query(`
                INSERT INTO price_data (timestamp, crypto_symbol, price_usd, market_cap, volume_24h)
                VALUES (NOW(), $1, $2, $3, $4)
                ON CONFLICT (timestamp, crypto_symbol) DO UPDATE
                SET price_usd = $2, market_cap = $3, volume_24h = $4
            `, [crypto.symbol.toUpperCase(), crypto.current_price, crypto.market_cap, crypto.total_volume]);
        }
    }

    async storeETFFlows(flowData, asset) {
        if (!flowData) return;

        for (const flow of flowData) {
            await db.query(`
                INSERT INTO etf_flows (date, asset, net_flow)
                VALUES (to_timestamp($1), $2, $3)
                ON CONFLICT (date, asset, etf_name) DO UPDATE
                SET net_flow = $3
            `, [flow.t, asset, flow.v]);
        }
    }

    async storeExchangeReserves(reserveData, crypto) {
        if (!reserveData) return;

        for (const reserve of reserveData) {
            await db.query(`
                INSERT INTO exchange_reserves (timestamp, crypto_symbol, balance)
                VALUES (to_timestamp($1), $2, $3)
            `, [reserve.t, crypto, reserve.v]);
        }
    }
}

module.exports = DataAggregator;
```

#### Step 6: Setup Scheduled Jobs

**backend/jobs/dataCollector.js**
```javascript
const cron = require('node-cron');
const DataAggregator = require('../services/dataAggregator');

const aggregator = new DataAggregator();

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running data collection job...');
    try {
        await aggregator.aggregateAllData();
        console.log('Data collection completed successfully');
    } catch (error) {
        console.error('Data collection failed:', error);
    }
});

// ETF data - run once daily at market close (4:00 PM EST = 21:00 UTC)
cron.schedule('0 21 * * 1-5', async () => {
    console.log('Running daily ETF collection...');
    // ETF-specific collection logic
});
```

#### Step 7: Create API Endpoints

**backend/routes/api.js**
```javascript
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
            WHERE date >= NOW() - INTERVAL '${days} days'
        `;

        if (asset) {
            query += ` AND asset = $1`;
        }

        query += ` ORDER BY date DESC`;

        const result = await db.query(query, asset ? [asset] : []);
        res.json(result.rows);
    } catch (error) {
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
            WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
        `;

        if (crypto) {
            query += ` AND crypto_symbol = $1`;
        }

        query += ` ORDER BY timestamp DESC`;

        const result = await db.query(query, crypto ? [crypto] : []);
        res.json(result.rows);
    } catch (error) {
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
            trackedAssets: prices.rows[0].tracked_assets
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### Phase 3: Frontend Development (Week 3-4)

#### Step 8: Create Dashboard Components

**frontend/components/ETFFlowChart.js**
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useEffect, useState } from 'react';

export default function ETFFlowChart({ asset }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchETFData();
    }, [asset]);

    const fetchETFData = async () => {
        try {
            const response = await fetch(
                `http://localhost:3001/api/etf-flows?asset=${asset}&days=30`
            );
            const json = await response.json();
            setData(json);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching ETF data:', error);
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">{asset} ETF Flows (30 Days)</h2>
            <LineChart width={800} height={400} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="net_flow" stroke="#8884d8" />
            </LineChart>
        </div>
    );
}
```

**frontend/components/ExchangeReserveTable.js**
```javascript
import { useEffect, useState } from 'react';

export default function ExchangeReserveTable() {
    const [reserves, setReserves] = useState([]);

    useEffect(() => {
        fetchReserves();
        const interval = setInterval(fetchReserves, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const fetchReserves = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/exchange-reserves');
            const json = await response.json();
            setReserves(json);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            <h2 className="text-2xl font-bold mb-4">Exchange Reserves</h2>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crypto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exchange</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reserves.map((reserve, index) => (
                        <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">{reserve.crypto_symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{reserve.exchange_name || 'All'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{reserve.balance.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {new Date(reserve.timestamp).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

**frontend/pages/index.js**
```javascript
import ETFFlowChart from '../components/ETFFlowChart';
import ExchangeReserveTable from '../components/ExchangeReserveTable';

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-blue-600 text-white p-6">
                <h1 className="text-4xl font-bold">Crypto Monitor Dashboard</h1>
                <p className="mt-2">Real-time ETF Flows & Exchange Reserves</p>
            </header>

            <main className="container mx-auto p-6">
                <div className="grid grid-cols-1 gap-6">
                    <ETFFlowChart asset="BTC" />
                    <ETFFlowChart asset="ETH" />
                    <ExchangeReserveTable />
                </div>
            </main>
        </div>
    );
}
```

### Phase 4: Real-Time Updates (Week 4)

#### Step 9: Implement WebSocket Server

**backend/websocket/server.js**
```javascript
const socketIO = require('socket.io');
const DataAggregator = require('../services/dataAggregator');

function initializeWebSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    const aggregator = new DataAggregator();

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Send initial data
        socket.emit('initial-data', { message: 'Connected to real-time feed' });

        // Subscribe to specific crypto
        socket.on('subscribe', (crypto) => {
            console.log(`Client subscribed to ${crypto}`);
            socket.join(crypto);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    // Broadcast updates every minute
    setInterval(async () => {
        try {
            const summary = await aggregator.aggregateAllData();
            io.emit('data-update', summary);
        } catch (error) {
            console.error('WebSocket update error:', error);
        }
    }, 60000);

    return io;
}

module.exports = initializeWebSocket;
```

#### Step 10: Connect Frontend to WebSocket

**frontend/hooks/useRealtimeData.js**
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useRealtimeData() {
    const [data, setData] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            setConnected(true);
        });

        socket.on('data-update', (newData) => {
            setData(newData);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return { data, connected };
}
```

---

## 7. Deployment Guide

### Option 1: Simple Deployment (Recommended for MVP)

#### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

#### Backend (Railway/Render)
1. Create account on Railway.app or Render.com
2. Connect your GitHub repository
3. Add environment variables
4. Deploy

#### Database (Railway/Supabase)
1. Create PostgreSQL instance on Railway or Supabase
2. Update DATABASE_URL in environment variables
3. Run migrations

### Option 2: Docker Deployment

**docker-compose.yml**
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/crypto_monitor
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      - db
      - redis

  db:
    image: timescale/timescaledb:latest-pg14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=crypto_monitor
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Deploy with:
```bash
docker-compose up -d
```

---

## 8. Cost Breakdown

### Monthly Operational Costs

#### API Subscriptions
- **CoinGecko Analyst:** $129/month
- **Glassnode Advanced:** $29-99/month
- **CoinGlass:** Contact for pricing (estimate $50-200/month)
- **Total APIs:** ~$200-400/month

#### Infrastructure
- **Frontend Hosting (Vercel):** Free - $20/month
- **Backend Hosting (Railway):** $5-20/month
- **Database (Supabase/Railway):** $0-25/month
- **Total Infrastructure:** $5-65/month

#### Total Monthly Cost: $205-465/month

### Free Tier Alternative: $0/month
- CoinGecko (Demo - Free)
- CoinMarketCap (Basic - Free)
- Dune Analytics (Free tier)
- Vercel (Free tier)
- Railway (Free tier with limits)

---

## 9. Monitoring & Maintenance

### Key Metrics to Track
1. **API Rate Limits** - Monitor usage to avoid hitting limits
2. **Database Size** - Time-series data grows quickly
3. **Response Times** - Track API latency
4. **Error Rates** - Monitor failed API calls
5. **Data Freshness** - Ensure data is updating properly

### Recommended Tools
- **Sentry** - Error tracking and monitoring
- **DataDog/Grafana** - Infrastructure monitoring
- **UptimeRobot** - Uptime monitoring (free tier available)

---

## 10. Future Enhancements

### Phase 2 Features
- [ ] Add email/SMS alerts for significant flows
- [ ] Historical data visualization (1Y, 3Y, 5Y)
- [ ] Export data to CSV/Excel
- [ ] Mobile app (React Native)
- [ ] User authentication & saved preferences
- [ ] Custom alerts and watchlists

### Phase 3 Features
- [ ] AI/ML predictions for flows
- [ ] Social sentiment analysis
- [ ] News aggregation
- [ ] Portfolio tracking
- [ ] Advanced analytics & reporting

---

## 11. Legal & Compliance

### Important Considerations
1. **API Terms of Service** - Review and comply with all API providers' ToS
2. **Data Usage Rights** - Ensure you have rights to display and redistribute data
3. **Rate Limiting** - Implement proper rate limiting to avoid bans
4. **Caching** - Cache data appropriately to reduce API calls
5. **Attribution** - Provide proper attribution to data sources
6. **Financial Advice Disclaimer** - Add disclaimer that this is not financial advice

### Sample Disclaimer
```
This website provides informational data only and does not constitute
financial advice. Cryptocurrency investments carry significant risk.
Always conduct your own research and consult with financial advisors
before making investment decisions.
```

---

## 12. Testing Strategy

### Backend Testing
```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run tests
npm test
```

### API Integration Tests
- Test all API endpoints
- Mock external API calls
- Test error handling
- Validate data transformations

### Frontend Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react jest

# Run tests
npm test
```

---

## 13. Support & Resources

### Documentation Links
- **CoinGecko API:** https://docs.coingecko.com
- **Glassnode API:** https://docs.glassnode.com
- **Next.js:** https://nextjs.org/docs
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Socket.io:** https://socket.io/docs/

### Community Resources
- **r/cryptocurrency** - Reddit community
- **CryptoTwitter** - Follow crypto analysts
- **GitHub** - Open source crypto projects
- **Discord** - Crypto developer communities

---

## Conclusion

This setup guide provides a comprehensive roadmap for building a professional crypto monitoring website. Start with the MVP using free tiers, validate your idea, then scale up with paid APIs as needed.

**Estimated Timeline:**
- **Week 1:** Setup & API integration
- **Week 2-3:** Backend development & data collection
- **Week 3-4:** Frontend development
- **Week 4:** Testing & deployment

**Next Steps:**
1. Sign up for API keys
2. Setup development environment
3. Build MVP with core features
4. Deploy and gather feedback
5. Iterate and add features

Good luck with your crypto monitoring platform!
