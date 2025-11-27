-- Create tables for storing data

-- ETF Flows
CREATE TABLE IF NOT EXISTS etf_flows (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    asset VARCHAR(10) NOT NULL, -- BTC, ETH, SOL, XRP
    etf_name VARCHAR(100),
    inflow DECIMAL(20, 8),
    outflow DECIMAL(20, 8),
    net_flow DECIMAL(20, 8),
    total_holdings DECIMAL(20, 8),
    source VARCHAR(50) DEFAULT 'glassnode', -- glassnode, coinglass
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, asset, etf_name)
);

-- Exchange Reserves
CREATE TABLE IF NOT EXISTS exchange_reserves (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    exchange_name VARCHAR(50),
    balance DECIMAL(30, 8),
    inflow_24h DECIMAL(30, 8),
    outflow_24h DECIMAL(30, 8),
    source VARCHAR(50) DEFAULT 'glassnode', -- glassnode, cryptoquant
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(timestamp, crypto_symbol, exchange_name)
);

-- Price Data (for reference)
CREATE TABLE IF NOT EXISTS price_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    price_usd DECIMAL(20, 8),
    market_cap DECIMAL(30, 2),
    volume_24h DECIMAL(30, 2),
    price_change_24h DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(timestamp, crypto_symbol)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etf_flows_date ON etf_flows(date);
CREATE INDEX IF NOT EXISTS idx_etf_flows_asset ON etf_flows(asset);
CREATE INDEX IF NOT EXISTS idx_exchange_reserves_timestamp ON exchange_reserves(timestamp);
CREATE INDEX IF NOT EXISTS idx_exchange_reserves_crypto ON exchange_reserves(crypto_symbol);
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp ON price_data(timestamp);
