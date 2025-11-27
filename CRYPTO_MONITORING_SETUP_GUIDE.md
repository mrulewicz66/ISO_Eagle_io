# XRP ETF & Exchange Supply Monitoring - Setup Guide

## Project Overview

This guide details how to build a real-time monitoring website focused on:
- **XRP ETF daily inflows and outflows** (GXRP, XRPC, EZRP, XRPM, XRP)
- **XRP supply on major exchanges** (Binance, Coinbase, Kraken, Upbit, etc.)
- **ISO 20022 compliant cryptocurrencies** for context

---

## 1. XRP ETFs Currently Trading (November 2025)

| Ticker | Issuer | Exchange | Fee |
|--------|--------|----------|-----|
| **GXRP** | Grayscale | NYSE Arca | 0% |
| **XRPC** | Canary Capital | - | - |
| **EZRP** | Franklin Templeton | - | 0.19% |
| **XRPM** | Amplify | - | 3% monthly |
| **XRP** | Bitwise | NYSE | - |
| **XRPR** | REX-Osprey | - | - |

---

## 2. Data Sources & APIs

### Required APIs (All Require Paid Plans)

#### 1. CoinGlass - XRP ETF Daily Flows
- **Website:** https://www.coinglass.com/pricing
- **Features:**
  - Dedicated XRP ETF flows endpoint
  - Daily inflows/outflows by ETF ticker (GXRP, XRPC, EZRP, etc.)
  - Historical data
- **Endpoint:** `/api/etf/xrp/flow-history`
- **Pricing:** Starts at $18/month (Hobbyist plan)
- **Note:** XRP ETF data requires paid subscription

#### 2. CryptoQuant - XRP Exchange Supply
- **Website:** https://cryptoquant.com/pricing
- **Features:**
  - XRP exchange reserves (total and per-exchange)
  - Exchange inflow/outflow tracking
  - Binance, Upbit, Coinbase, Kraken breakdown
- **Endpoints:**
  - `/v1/xrp/exchange-flows/exchange-reserve`
  - `/v1/xrp/exchange-flows/exchange-inflow`
  - `/v1/xrp/exchange-flows/exchange-outflow`
- **Pricing:** Paid subscription required

#### 3. CoinGecko - Price Data (FREE)
- **Website:** https://api.coingecko.com/api/v3
- **Features:**
  - Real-time XRP price
  - Market cap, volume, 24h change
  - ISO 20022 token prices (XRP, XLM, ADA, ALGO, HBAR, IOTA, QNT, XDC)
  - Top 10 cryptocurrencies
- **Pricing:** FREE public API (no key required, ~10-30 calls/min)
- **Status:** WORKING

---

## 3. Environment Setup

### Required API Keys

Create `.env` file in backend:
```bash
# Priority 1 - XRP ETF Flows
COINGLASS_API_KEY=your_key_here

# Priority 2 - XRP Exchange Supply
CRYPTOQUANT_API_KEY=your_key_here

# Priority 3 - Price Data (optional)
COINGECKO_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crypto_monitor
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Where to Get API Keys

1. **CoinGlass**
   - Go to https://www.coinglass.com/pricing
   - Create account
   - Navigate to Account > API
   - Generate API key

2. **CryptoQuant**
   - Go to https://cryptoquant.com/pricing
   - Sign up for "Community" (free) plan
   - Go to Settings > API
   - Generate API key

3. **CoinGecko**
   - Go to https://www.coingecko.com/en/api/pricing
   - Sign up for "Demo" (free) plan
   - Get API key from dashboard

---

## 4. Project Structure

```
cointracker/
├── backend/
│   ├── services/
│   │   ├── coinGlassService.js    # XRP ETF flows
│   │   ├── cryptoQuantService.js  # XRP exchange supply
│   │   ├── coinGeckoService.js    # Price data
│   │   └── dataAggregator.js      # Orchestrator
│   ├── routes/
│   │   └── api.js
│   ├── db/
│   │   ├── database.js
│   │   └── schema.sql
│   ├── jobs/
│   │   └── dataCollector.js
│   ├── websocket/
│   │   └── server.js
│   ├── index.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── XRPDashboard.tsx       # XRP ETF flows
│   │   │   ├── XRPExchangeSupply.tsx  # XRP exchange reserves
│   │   │   ├── ISO20022Table.tsx      # ISO 20022 tokens
│   │   │   ├── PriceTable.tsx         # Top 10 prices
│   │   │   └── ConnectionStatus.tsx   # WebSocket status
│   │   └── lib/
│   │       └── api.ts
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── CRYPTO_MONITORING_SETUP_GUIDE.md
```

---

## 5. Quick Start

### Step 1: Clone and Install
```bash
cd cointracker

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Start Database
```bash
cd ..
docker-compose up -d
```

### Step 3: Add API Keys
Edit `backend/.env` and add your API keys.

### Step 4: Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: View Dashboard
Open http://localhost:3000

---

## 6. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │XRP ETF Flows│  │XRP Exchange  │  │ISO 20022      │  │
│  │  Dashboard  │  │   Supply     │  │   Tokens      │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Data Aggregator                     │   │
│  │  - Fetches XRP data every 5 minutes             │   │
│  │  - Stores in PostgreSQL                         │   │
│  │  - Broadcasts via WebSocket                     │   │
│  └─────────────────────────────────────────────────┘   │
└────────────┬──────────────────┬─────────────────────────┘
             │                  │
             ▼                  ▼
      ┌────────────┐    ┌──────────────┐
      │ CoinGlass  │    │ CryptoQuant  │
      │ XRP ETF    │    │ XRP Exchange │
      │  Flows     │    │   Supply     │
      └────────────┘    └──────────────┘
```

---

## 7. Key Metrics Tracked

### XRP ETF Flows
- Daily net inflows/outflows (USD)
- Per-ETF breakdown (GXRP, XRPC, EZRP, etc.)
- Historical trends (30 days)

### XRP Exchange Supply
- Total XRP on exchanges (aggregated)
- Per-exchange breakdown:
  - Binance (~3.6B XRP)
  - Upbit (~6.1B XRP)
  - Coinbase
  - Kraken
  - Bybit
  - OKX
- Inflow/outflow trends

### ISO 20022 Tokens (Context)
- XRP, XLM, XDC, ALGO, IOTA, HBAR, QNT, ADA
- Price, market cap, 24h change

---

## 8. Database Schema

```sql
-- XRP ETF Flows
CREATE TABLE etf_flows (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    asset VARCHAR(10) NOT NULL,  -- XRP
    etf_name VARCHAR(100),       -- GXRP, XRPC, etc.
    net_flow DECIMAL(20, 8),
    source VARCHAR(50),          -- coinglass
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, asset, etf_name)
);

-- XRP Exchange Reserves
CREATE TABLE exchange_reserves (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,  -- XRP
    exchange_name VARCHAR(50),           -- binance, upbit, etc.
    balance DECIMAL(30, 8),
    source VARCHAR(50),                  -- cryptoquant
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(timestamp, crypto_symbol, exchange_name)
);

-- Price Data
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
```

---

## 9. Cost Breakdown

### Current Working Stack (FREE)
| Service | Plan | Cost | Data Provided | Status |
|---------|------|------|---------------|--------|
| CoinGecko | Public API | $0 | Price data, market cap, volume | WORKING |
| Vercel (Frontend) | Free | $0 | Hosting | - |
| Railway (Backend) | Free | $0 | Hosting | - |
| **Current Total** | | **$0/month** | | |

### Optional Paid Upgrades
| Service | Plan | Cost | Data Provided |
|---------|------|------|---------------|
| CoinGlass | Hobbyist | $18/month | XRP ETF flows (GXRP, XRPC, etc.) |
| CryptoQuant | Paid | TBD | XRP exchange reserves |

### What Works for Free
- Real-time XRP price, market cap, volume
- ISO 20022 tokens (XRP, XLM, ADA, ALGO, HBAR, IOTA, QNT, XDC)
- Top 10 cryptocurrencies by market cap

### What Requires Paid Plans
- XRP ETF daily inflows/outflows (CoinGlass $18+/mo)
- XRP exchange reserve data (CryptoQuant - paid)

---

## 10. Legal & Compliance

### Disclaimer
```
This website provides informational data only and does not constitute
financial advice. XRP and cryptocurrency investments carry significant risk.
Always conduct your own research and consult with financial advisors
before making investment decisions. XRP ETF data is for informational
purposes only.
```

### Data Attribution
- XRP ETF data provided by CoinGlass
- XRP exchange data provided by CryptoQuant
- Price data provided by CoinGecko

---

## 11. Support & Resources

### API Documentation
- **CoinGlass:** https://docs.coinglass.com
- **CryptoQuant:** https://cryptoquant.com/docs
- **CoinGecko:** https://docs.coingecko.com

### XRP Resources
- **XRPL:** https://xrpl.org
- **Ripple:** https://ripple.com
- **XRP ETF Tracker:** https://www.theblock.co/xrp-etf-live-chart

---

## Quick Reference

### Start Development
```bash
# Start database
docker-compose up -d

# Start backend (port 3001)
cd backend && npm run dev

# Start frontend (port 3000)
cd frontend && npm run dev
```

### API Endpoints
```
GET /api/etf-flows?asset=XRP&days=30     # XRP ETF flows
GET /api/exchange-reserves?crypto=XRP    # XRP exchange supply
GET /api/prices                          # All prices
GET /api/dashboard-summary               # Dashboard summary
```

### WebSocket Events
```javascript
socket.on('data-update', (data) => {
    // Real-time XRP data updates
});
```
