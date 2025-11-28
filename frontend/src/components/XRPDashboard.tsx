'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';

interface ETFFlow {
    date: string;
    timestamp: number;
    net_flow: number;
    price_usd: number;
    etf_breakdown: {
        ticker: string;
        flow_usd: number;
    }[];
    displayDate?: string;
}

interface PriceData {
    price_usd: number;
    market_cap: number;
    volume_24h: number;
    price_change_24h: number;
}

interface ExchangeBalance {
    exchange: string;
    balance: number;
    change_1d: number;
    change_1d_pct: number;
    change_7d: number;
    change_7d_pct: number;
    change_30d: number;
    change_30d_pct: number;
}

interface ExchangeData {
    exchanges: ExchangeBalance[];
    totals: {
        balance: number;
        change_1d: number;
        change_7d: number;
        change_30d: number;
    };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ETF_INFO: { [key: string]: { color: string; institution: string } } = {
    'XRPC': { color: '#10B981', institution: 'Canary Capital' },
    'XRPZ': { color: '#3B82F6', institution: 'Franklin Templeton' },
    'XRP': { color: '#F59E0B', institution: 'Bitwise' },
    'GXRP': { color: '#8B5CF6', institution: 'Grayscale' },
};

// Exchange logo URLs (using CoinGecko/public sources)
const EXCHANGE_LOGOS: { [key: string]: string } = {
    'Binance': 'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
    'OKX': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23000" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">OKX</text></svg>',
    'Okx': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23000" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">OKX</text></svg>',
    'okx': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23000" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">OKX</text></svg>',
    'Bybit': 'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png',
    'Bitfinex': 'https://assets.coingecko.com/markets/images/4/small/BItfinex.png',
    'Kraken': 'https://assets.coingecko.com/markets/images/29/small/kraken.jpg',
    'KuCoin': 'https://assets.coingecko.com/markets/images/61/small/kucoin.png',
    'Huobi': 'https://assets.coingecko.com/markets/images/25/small/huobi.jpg',
    'HTX': 'https://assets.coingecko.com/markets/images/25/small/huobi.jpg',
    'Gate.io': 'https://assets.coingecko.com/markets/images/60/small/gateio.png',
    'Gate': 'https://assets.coingecko.com/markets/images/60/small/gateio.png',
    'Coinbase': 'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png',
    'Crypto.com': 'https://assets.coingecko.com/markets/images/589/small/crypto_com.jpg',
    'Bitstamp': 'https://assets.coingecko.com/markets/images/9/small/bitstamp.jpg',
    'Upbit': 'https://assets.coingecko.com/markets/images/117/small/upbit.png',
    'Bithumb': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23FF6B00" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle">BTH</text></svg>',
    'bithumb': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23FF6B00" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle">BTH</text></svg>',
    'BITHUMB': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23FF6B00" width="32" height="32" rx="6"/><text x="16" y="21" fill="%23fff" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle">BTH</text></svg>',
    'Bitget': 'https://assets.coingecko.com/markets/images/540/small/Bitget.png',
    'MEXC': 'https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square.jpeg',
    'Poloniex': 'https://assets.coingecko.com/markets/images/37/small/poloniex.png',
    'Gemini': 'https://assets.coingecko.com/markets/images/50/small/gemini.png',
    'Bittrex': 'https://assets.coingecko.com/markets/images/10/small/bittrex.png',
    'BitMart': 'https://assets.coingecko.com/markets/images/239/small/BitMart.png',
};

// Helper to get exchange logo with fallback
const getExchangeLogo = (exchangeName: string): string | null => {
    // Try exact match first
    if (EXCHANGE_LOGOS[exchangeName]) return EXCHANGE_LOGOS[exchangeName];

    // Try case-insensitive match
    const lowerName = exchangeName.toLowerCase();
    for (const [key, url] of Object.entries(EXCHANGE_LOGOS)) {
        if (key.toLowerCase() === lowerName || lowerName.includes(key.toLowerCase())) {
            return url;
        }
    }
    return null;
};

type ChartType = 'bar' | 'area' | 'line' | 'composed';
type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

// Custom tooltip component for ETF flow charts
const CustomTooltip = ({ active, payload, label, formatFlow }: {
    active?: boolean;
    payload?: Array<{ payload: ETFFlow & { displayDate: string } }>;
    label?: string;
    formatFlow: (num: number) => string;
}) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const netFlow = data.net_flow;
    const etfBreakdown = data.etf_breakdown || [];

    return (
        <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '12px 16px',
            minWidth: '200px'
        }}>
            <div style={{ color: 'white', fontWeight: 600, marginBottom: '8px', borderBottom: '1px solid rgba(75, 85, 99, 0.5)', paddingBottom: '8px' }}>
                {data.displayDate}
            </div>
            <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Net Flow: </span>
                <span style={{ color: netFlow >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    {netFlow >= 0 ? '+' : ''}${formatFlow(netFlow)}
                </span>
            </div>
            {data.price_usd && (
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '12px' }}>XRP Price: </span>
                    <span style={{ color: 'white' }}>${data.price_usd.toFixed(4)}</span>
                </div>
            )}
            {etfBreakdown.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(75, 85, 99, 0.5)', paddingTop: '8px', marginTop: '4px' }}>
                    <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>ETF Breakdown:</div>
                    {etfBreakdown.filter(etf => etf.flow_usd !== 0).map((etf, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: ETF_INFO[etf.ticker]?.color || '#6B7280'
                                }} />
                                <span style={{ color: 'white', fontSize: '12px' }}>{etf.ticker}</span>
                                <span style={{ color: '#6B7280', fontSize: '10px' }}>{ETF_INFO[etf.ticker]?.institution}</span>
                            </div>
                            <span style={{ color: etf.flow_usd >= 0 ? '#4ade80' : '#f87171', fontSize: '12px', fontWeight: 500 }}>
                                {etf.flow_usd >= 0 ? '+' : ''}${formatFlow(etf.flow_usd)}
                            </span>
                        </div>
                    ))}
                    {etfBreakdown.filter(etf => etf.flow_usd !== 0).length === 0 && (
                        <div style={{ color: '#6B7280', fontSize: '11px' }}>No breakdown available</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function XRPDashboard() {
    const [etfFlows, setEtfFlows] = useState<ETFFlow[]>([]);
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [exchangeData, setExchangeData] = useState<ExchangeData | null>(null);
    const [totalInflow, setTotalInflow] = useState(0);
    const [totalOutflow, setTotalOutflow] = useState(0);
    const [avgDailyInflow, setAvgDailyInflow] = useState(0);
    const [daysTracked, setDaysTracked] = useState(0);
    const [dailyInflow, setDailyInflow] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<ChartType>('composed');
    const [showMockData, setShowMockData] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const [etfRes, pricesRes, exchangeRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/xrp-etf-flows`, { signal: controller.signal }),
                fetch(`${API_BASE_URL}/api/prices`, { signal: controller.signal }),
                fetch(`${API_BASE_URL}/api/xrp-exchange-balances`, { signal: controller.signal })
            ]);
            clearTimeout(timeoutId);

            if (etfRes.ok) {
                const flows = await etfRes.json();
                if (flows.length > 0) {
                    // Sort by date ascending for chart
                    const sorted = [...flows].sort((a, b) => a.timestamp - b.timestamp);
                    // Format dates for display
                    const formatted = sorted.map(f => ({
                        ...f,
                        displayDate: new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }));
                    setEtfFlows(formatted);

                    const inflow = sorted.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0);
                    const outflow = Math.abs(sorted.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0));
                    const avgDailyInflow = sorted.length > 0 ? inflow / sorted.length : 0;
                    // Get latest day's flow (last entry in sorted array)
                    const latestDayFlow = sorted.length > 0 ? sorted[sorted.length - 1].net_flow : 0;
                    setTotalInflow(inflow);
                    setTotalOutflow(outflow);
                    setAvgDailyInflow(avgDailyInflow);
                    setDaysTracked(sorted.length);
                    setDailyInflow(latestDayFlow);
                }
            }

            if (pricesRes.ok) {
                const prices = await pricesRes.json();
                const xrp = prices.find((p: { crypto_symbol: string }) => p.crypto_symbol === 'XRP');
                if (xrp) {
                    setPriceData({
                        price_usd: parseFloat(xrp.price_usd),
                        market_cap: parseFloat(xrp.market_cap),
                        volume_24h: parseFloat(xrp.volume_24h),
                        price_change_24h: parseFloat(xrp.price_change_24h) || 0
                    });
                }
            }

            if (exchangeRes.ok) {
                const data = await exchangeRes.json();
                setExchangeData(data);
            }
        } catch (err) {
            // Silently handle network errors when backend is unavailable
            if (!(err instanceof Error && (err.name === 'AbortError' || err.message === 'Failed to fetch'))) {
                console.error('Error fetching XRP data:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    const formatFlow = (num: number) => {
        const abs = Math.abs(num);
        if (abs >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
        if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(0);
    };

    const formatXRP = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        return num.toLocaleString();
    };

    // Generate mock data for 12 months (Nov 27, 2025 - Nov 27, 2026)
    const generateMockData = (): ETFFlow[] => {
        const mockData: ETFFlow[] = [];
        const startDate = new Date('2025-11-27');
        const endDate = new Date('2026-11-27');
        const etfTickers = ['XRPC', 'XRPZ', 'XRP', 'GXRP'];

        // Growth phases with realistic ETF adoption curve
        const getFlowForDate = (date: Date): number => {
            const monthsFromStart = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

            // Simulate exponential growth with volatility
            // Phase 1 (0-3 months): $100M-$500M daily
            // Phase 2 (3-6 months): $500M-$2B daily
            // Phase 3 (6-9 months): $2B-$10B daily
            // Phase 4 (9-12 months): $10B-$100B daily (massive institutional adoption)

            let baseFlow: number;
            if (monthsFromStart < 3) {
                baseFlow = 100e6 + (monthsFromStart / 3) * 400e6;
            } else if (monthsFromStart < 6) {
                baseFlow = 500e6 + ((monthsFromStart - 3) / 3) * 1.5e9;
            } else if (monthsFromStart < 9) {
                baseFlow = 2e9 + ((monthsFromStart - 6) / 3) * 8e9;
            } else {
                baseFlow = 10e9 + ((monthsFromStart - 9) / 3) * 90e9;
            }

            // Add daily volatility (-30% to +50%)
            const volatility = 0.7 + Math.random() * 0.8;
            // 15% chance of outflow day
            const isOutflow = Math.random() < 0.15;

            return isOutflow ? -baseFlow * volatility * 0.3 : baseFlow * volatility;
        };

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const netFlow = getFlowForDate(currentDate);
            const timestamp = currentDate.getTime();

            // Distribute flow among ETFs
            const breakdown = etfTickers.map(ticker => ({
                ticker,
                flow_usd: Math.max(0, netFlow * (0.15 + Math.random() * 0.35))
            }));

            mockData.push({
                date: currentDate.toISOString().split('T')[0],
                timestamp,
                net_flow: netFlow,
                price_usd: 2.5 + Math.random() * 10, // XRP price $2.50-$12.50
                etf_breakdown: breakdown,
                displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });

            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }

        return mockData;
    };

    // Memoize mock data so it doesn't regenerate on every render
    const mockData = useMemo(() => generateMockData(), []);

    // Use mock or real data based on toggle
    const baseData = showMockData ? mockData : etfFlows;

    // Filter data based on time range
    const displayData = useMemo(() => {
        if (timeRange === 'all' || baseData.length === 0) return baseData;

        // Use the latest date in the data as reference (not current date)
        // This makes filters work correctly with both real and mock data
        const latestTimestamp = Math.max(...baseData.map(f => f.timestamp));
        const latestDate = new Date(latestTimestamp);
        let cutoffDate: Date;

        switch (timeRange) {
            case 'daily':
                cutoffDate = new Date(latestDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                cutoffDate = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                cutoffDate = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'yearly':
                cutoffDate = new Date(latestDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                return baseData;
        }

        return baseData.filter(flow => new Date(flow.timestamp) >= cutoffDate);
    }, [baseData, timeRange]);

    // Calculate totals from display data
    const displayTotalInflow = showMockData
        ? mockData.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0)
        : totalInflow;
    const displayTotalOutflow = showMockData
        ? Math.abs(mockData.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0))
        : totalOutflow;
    const displayAvgDaily = showMockData
        ? displayTotalInflow / mockData.length
        : avgDailyInflow;
    const displayDaysTracked = showMockData ? mockData.length : daysTracked;
    const displayDailyInflow = showMockData
        ? mockData[mockData.length - 1]?.net_flow || 0
        : dailyInflow;

    const netFlow = displayTotalInflow - displayTotalOutflow;

    // Get latest ETF breakdown for pie chart
    const latestETFBreakdown = etfFlows.length > 0
        ? etfFlows[etfFlows.length - 1].etf_breakdown.filter(e => e.flow_usd > 0)
        : [];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse bg-zinc-800 h-48 rounded-xl"></div>
                <div className="animate-pulse bg-zinc-800 h-96 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* XRP Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                        <img
                            src="/xrplogo.png"
                            alt="XRP"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">XRP ETF Monitor</h1>
                        <p className="text-blue-100">Real-time institutional flow tracking (CoinGlass)</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="text-blue-100 text-sm mb-1">Current Price</div>
                        <div className="text-2xl font-bold text-white">
                            ${priceData?.price_usd.toFixed(4) || '-'}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                            <div className="text-blue-200/60 text-xs">24h Change</div>
                            {priceData && priceData.price_change_24h !== 0 ? (
                                <span className={`text-sm font-bold ${priceData.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {priceData.price_change_24h >= 0 ? '+' : ''}{priceData.price_change_24h.toFixed(2)}%
                                </span>
                            ) : (
                                <span className="text-sm text-zinc-400">-</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="text-blue-100 text-sm mb-1">Market Cap</div>
                        <div className="text-2xl font-bold text-white">
                            {priceData ? formatNumber(priceData.market_cap) : '-'}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                            <div className="text-blue-200/60 text-xs">24h Volume</div>
                            <span className="text-sm font-medium text-blue-200">
                                {priceData ? formatNumber(priceData.volume_24h) : '-'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur rounded-xl p-4 border border-green-400/30">
                        <div className="text-green-200 text-sm mb-1">Total ETF Inflows</div>
                        <div className="text-2xl font-bold text-green-400">
                            +${formatFlow(displayTotalInflow)}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-500/20">
                            <div>
                                <div className="text-green-300/60 text-xs">Daily (24h)</div>
                                <div className={`text-sm font-bold ${displayDailyInflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {displayDailyInflow >= 0 ? '+' : ''}${formatFlow(displayDailyInflow)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-green-300/60 text-xs">Avg/day</div>
                                <div className="text-sm font-medium text-green-300">
                                    ${formatFlow(displayAvgDaily)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur rounded-xl p-4 border border-red-400/30">
                        <div className="text-red-200 text-sm mb-1">Total ETF Outflows</div>
                        <div className="text-2xl font-bold text-red-400">
                            -${formatFlow(displayTotalOutflow)}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-500/20">
                            <div>
                                <div className="text-red-300/60 text-xs">Daily (24h)</div>
                                <div className={`text-sm font-bold ${displayDailyInflow < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                    {displayDailyInflow < 0 ? `-$${formatFlow(Math.abs(displayDailyInflow))}` : '$0'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-red-300/60 text-xs">Avg/day</div>
                                <div className="text-sm font-medium text-red-300">
                                    ${formatFlow(displayDaysTracked > 0 ? displayTotalOutflow / displayDaysTracked : 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mock Data Toggle - hidden in production */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 flex items-center justify-end gap-3">
                        <span className="text-blue-200 text-sm">Test Scalability:</span>
                        <button
                            onClick={() => setShowMockData(!showMockData)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                showMockData
                                    ? 'bg-yellow-500 text-black'
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            }`}
                        >
                            {showMockData ? 'MOCK DATA (12 months)' : 'Show Mock Data'}
                        </button>
                    </div>
                )}
            </div>

            {/* ETF Flow Chart */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-700/50 backdrop-blur">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            XRP ETF Daily Flows
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">Net inflows and outflows (USD)</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        {/* Time Range Selector */}
                        <div className="flex bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/50">
                            {[
                                { range: 'daily' as TimeRange, label: '1D' },
                                { range: 'weekly' as TimeRange, label: '1W' },
                                { range: 'monthly' as TimeRange, label: '1M' },
                                { range: 'yearly' as TimeRange, label: '1Y' },
                                { range: 'all' as TimeRange, label: 'All' },
                            ].map(({ range, label }) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                        timeRange === range
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {/* Chart Type Selector */}
                        <div className="flex bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/50">
                            {[
                                { type: 'bar' as ChartType, label: 'Bar' },
                                { type: 'area' as ChartType, label: 'Area' },
                                { type: 'line' as ChartType, label: 'Line' },
                                { type: 'composed' as ChartType, label: 'Combined' },
                            ].map(({ type, label }) => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                        chartType === type
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                                    }`}
                                    title={label}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className={`px-4 py-2 rounded-full font-semibold ${netFlow >= 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            Net: {netFlow >= 0 ? '+' : ''}${formatFlow(netFlow)}
                        </div>
                    </div>
                </div>

                {etfFlows.length > 0 ? (
                    <div className="w-full pl-4">
                        {/* Special 1D View - Summary instead of sparse chart */}
                        {timeRange === 'daily' && displayData.length <= 2 ? (
                            <div className="h-[380px] flex flex-col justify-center">
                                {displayData.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                                        {/* Latest Day Summary */}
                                        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                                            <h3 className="text-lg font-bold text-white mb-4">Latest Day Flow</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400">Date</span>
                                                    <span className="text-white font-medium">{displayData[displayData.length - 1]?.displayDate}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400">Net Flow</span>
                                                    <span className={`text-2xl font-bold ${displayData[displayData.length - 1]?.net_flow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {displayData[displayData.length - 1]?.net_flow >= 0 ? '+' : ''}${formatFlow(displayData[displayData.length - 1]?.net_flow || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400">XRP Price</span>
                                                    <span className="text-white font-medium">${displayData[displayData.length - 1]?.price_usd?.toFixed(4) || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ETF Breakdown for the day */}
                                        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                                            <h3 className="text-lg font-bold text-white mb-4">ETF Breakdown</h3>
                                            <div className="space-y-3">
                                                {displayData[displayData.length - 1]?.etf_breakdown?.filter(e => e.flow_usd !== 0).map(etf => (
                                                    <div key={etf.ticker} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: ETF_INFO[etf.ticker]?.color || '#6B7280' }}
                                                            />
                                                            <span className="text-zinc-300 font-medium">{etf.ticker}</span>
                                                            <span className="text-zinc-500 text-sm">{ETF_INFO[etf.ticker]?.institution}</span>
                                                        </div>
                                                        <span className={`font-bold ${etf.flow_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {etf.flow_usd >= 0 ? '+' : ''}${formatFlow(etf.flow_usd)}
                                                        </span>
                                                    </div>
                                                )) || (
                                                    <p className="text-zinc-500">No ETF breakdown available</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Message about 1D view */}
                                        <div className="md:col-span-2 text-center py-4">
                                            <p className="text-zinc-500 text-sm">
                                                ETF flow data is aggregated daily. Select 1W or longer for time-series charts.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-zinc-500">No data available for today</p>
                                        <p className="text-zinc-600 text-sm mt-2">Select 1W or longer for historical data</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                        <ResponsiveContainer width="95%" height={380}>
                            {chartType === 'bar' ? (
                                <BarChart data={displayData} margin={{ top: 20, right: 20, left: 80, bottom: 40 }}>
                                    <defs>
                                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#16A34A" stopOpacity={0.8} />
                                        </linearGradient>
                                        <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={{ stroke: '#4B5563' }} interval={0} />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#4B5563' }} />
                                    <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} />} />
                                    <Bar dataKey="net_flow" name="Net Flow" radius={[4, 4, 0, 0]}>
                                        {displayData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.net_flow >= 0 ? 'url(#greenGradient)' : 'url(#redGradient)'}
                                                stroke={entry.net_flow >= 0 ? '#22C55E' : '#EF4444'}
                                                strokeWidth={2}
                                                filter="url(#glow)"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : chartType === 'area' ? (
                                <AreaChart data={displayData} margin={{ top: 20, right: 20, left: 80, bottom: 40 }}>
                                    <defs>
                                        <linearGradient id="areaGradientPositive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#22C55E" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="areaGradientNegative" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} />} />
                                    <Area
                                        type="monotone"
                                        dataKey="net_flow"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        fill="url(#areaGradientPositive)"
                                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#A78BFA', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            ) : chartType === 'line' ? (
                                <LineChart data={displayData} margin={{ top: 20, right: 20, left: 80, bottom: 40 }}>
                                    <defs>
                                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#3B82F6" />
                                            <stop offset="50%" stopColor="#8B5CF6" />
                                            <stop offset="100%" stopColor="#EC4899" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} />} />
                                    <Line
                                        type="monotone"
                                        dataKey="net_flow"
                                        stroke="url(#lineGradient)"
                                        strokeWidth={4}
                                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5, stroke: '#1F2937' }}
                                        activeDot={{ r: 8, fill: '#A78BFA', stroke: '#fff', strokeWidth: 3 }}
                                    />
                                </LineChart>
                            ) : chartType === 'composed' ? (
                                <ComposedChart data={displayData} margin={{ top: 20, right: 20, left: 80, bottom: 40 }}>
                                    <defs>
                                        <linearGradient id="composedGreenGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#16A34A" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="composedRedGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#DC2626" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} />} />
                                    <Bar dataKey="net_flow" name="Net Flow" radius={[4, 4, 0, 0]}>
                                        {displayData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.net_flow >= 0 ? 'url(#composedGreenGradient)' : 'url(#composedRedGradient)'}
                                                stroke={entry.net_flow >= 0 ? '#22C55E' : '#EF4444'}
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Bar>
                                    <Line
                                        type="monotone"
                                        dataKey="net_flow"
                                        stroke="#FBBF24"
                                        strokeWidth={3}
                                        dot={{ fill: '#FBBF24', strokeWidth: 2, r: 4, stroke: '#1F2937' }}
                                    />
                                </ComposedChart>
                            ) : null}
                        </ResponsiveContainer>
                        )}
                    </div>
                ) : (
                    <div className="h-[380px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                            <p className="text-zinc-500">No ETF flow data available</p>
                        </div>
                    </div>
                )}

                {/* ETF Breakdown Legend */}
                {latestETFBreakdown.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-700">
                        <h3 className="text-sm font-medium text-zinc-400 mb-3">Latest Day ETF Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {latestETFBreakdown.map(etf => (
                                <div key={etf.ticker} className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: ETF_INFO[etf.ticker]?.color || '#6B7280' }}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{etf.ticker}</span>
                                            <span className="text-xs text-zinc-500">•</span>
                                            <span className="text-xs text-zinc-400 truncate">{ETF_INFO[etf.ticker]?.institution || 'Unknown'}</span>
                                        </div>
                                        <div className="text-sm font-medium text-green-400">${formatFlow(etf.flow_usd)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ETF Market Hours Note */}
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <p className="text-xs text-zinc-500">
                        ETF data is available for trading days only (Mon-Fri). Weekend gaps are normal. Today's data appears after US market close (~4pm ET).
                    </p>
                </div>
            </div>

            {/* Exchange Reserves Section */}
            {exchangeData && (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-xl shadow-xl border border-zinc-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">XRP Exchange Reserves</h2>
                            <p className="text-zinc-400 text-sm">XRP holdings on major exchanges (CoinGlass)</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{formatXRP(exchangeData.totals.balance)} XRP</div>
                            <div className={`text-sm ${exchangeData.totals.change_30d < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {exchangeData.totals.change_30d < 0 ? '' : '+'}{formatXRP(exchangeData.totals.change_30d)} (30d)
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-700">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Exchange</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Balance (XRP)</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">24h Change</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">7d Change</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">30d Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                                {exchangeData.exchanges.slice(0, 10).map((ex) => (
                                    <tr key={ex.exchange} className="hover:bg-zinc-800/50">
                                        <td className="px-4 py-3 text-sm font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-5 h-5">
                                                    {/* Fallback always rendered behind */}
                                                    <div className="absolute inset-0 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                                                        {ex.exchange.charAt(0)}
                                                    </div>
                                                    {/* Image overlays fallback when loaded successfully */}
                                                    {getExchangeLogo(ex.exchange) && (
                                                        <img
                                                            src={getExchangeLogo(ex.exchange)!}
                                                            alt={ex.exchange}
                                                            className="absolute inset-0 w-5 h-5 rounded-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <span>{ex.exchange}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-white">{formatXRP(ex.balance)}</td>
                                        <td className={`px-4 py-3 text-sm text-right font-medium ${ex.change_1d_pct <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {ex.change_1d_pct > 0 ? '+' : ''}{ex.change_1d_pct?.toFixed(2)}%
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-medium ${ex.change_7d_pct <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {ex.change_7d_pct > 0 ? '+' : ''}{ex.change_7d_pct?.toFixed(2)}%
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-medium ${ex.change_30d_pct <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {ex.change_30d_pct > 0 ? '+' : ''}{ex.change_30d_pct?.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-xs text-zinc-400">
                            <span className="text-green-400">Green = XRP leaving exchanges</span> (bullish: users moving to self-custody) |
                            <span className="text-red-400 ml-1">Red = XRP entering exchanges</span> (bearish: potential sell pressure)
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
