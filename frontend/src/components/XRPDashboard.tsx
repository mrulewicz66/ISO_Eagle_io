'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
    dayStatus?: 'trading' | 'weekend' | 'holiday' | 'early_close' | 'pending';
    dayName?: string;
    dayNote?: string;
    cumulative_flow?: number;
}

interface PriceData {
    price_usd: number;
    market_cap: number;
    volume_24h: number;
    price_change_24h: number;
    price_change_7d: number | null;
    volume_7d: number | null;
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

interface ExchangeHistoryPoint {
    date: string;
    timestamp: number;
    total: number;
    exchanges: { [key: string]: number };
}

interface ExchangeHistoryData {
    history: ExchangeHistoryPoint[];
    exchanges: string[];
    dateRange: {
        start: string;
        end: string;
        points: number;
    };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============ NYSE HOLIDAY CALENDAR (Dynamic for any year) ============

interface MarketDay {
    isHoliday: boolean;
    isEarlyClose: boolean;
    name?: string;
    note?: string;
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
const getEasterSunday = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
};

// Get the nth occurrence of a weekday in a month (1-indexed)
const getNthWeekdayOfMonth = (year: number, month: number, weekday: number, n: number): Date => {
    const firstDay = new Date(Date.UTC(year, month, 1));
    let dayOffset = (weekday - firstDay.getUTCDay() + 7) % 7;
    const day = 1 + dayOffset + (n - 1) * 7;
    return new Date(Date.UTC(year, month, day));
};

// Get the last occurrence of a weekday in a month
const getLastWeekdayOfMonth = (year: number, month: number, weekday: number): Date => {
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const diff = (lastDay.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month, lastDay.getUTCDate() - diff));
};

// Adjust for observed holidays (if falls on weekend)
const getObservedDate = (date: Date): Date => {
    const day = date.getUTCDay();
    if (day === 0) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)); // Sunday -> Monday
    if (day === 6) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1)); // Saturday -> Friday
    return date;
};

// Generate all NYSE holidays for a given year
const generateNYSEHolidays = (year: number): Map<string, MarketDay> => {
    const holidays = new Map<string, MarketDay>();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // New Year's Day (Jan 1, observed)
    const newYears = getObservedDate(new Date(Date.UTC(year, 0, 1)));
    holidays.set(fmt(newYears), { isHoliday: true, isEarlyClose: false, name: "New Year's Day", note: "Markets closed" });

    // Martin Luther King Jr. Day (3rd Monday of January)
    const mlkDay = getNthWeekdayOfMonth(year, 0, 1, 3);
    holidays.set(fmt(mlkDay), { isHoliday: true, isEarlyClose: false, name: "Martin Luther King Jr. Day", note: "Markets closed" });

    // Presidents Day (3rd Monday of February)
    const presidentsDay = getNthWeekdayOfMonth(year, 1, 1, 3);
    holidays.set(fmt(presidentsDay), { isHoliday: true, isEarlyClose: false, name: "Presidents Day", note: "Markets closed" });

    // Good Friday (Friday before Easter)
    const easter = getEasterSunday(year);
    const goodFriday = new Date(Date.UTC(easter.getUTCFullYear(), easter.getUTCMonth(), easter.getUTCDate() - 2));
    holidays.set(fmt(goodFriday), { isHoliday: true, isEarlyClose: false, name: "Good Friday", note: "Markets closed" });

    // Memorial Day (Last Monday of May)
    const memorialDay = getLastWeekdayOfMonth(year, 4, 1);
    holidays.set(fmt(memorialDay), { isHoliday: true, isEarlyClose: false, name: "Memorial Day", note: "Markets closed" });

    // Juneteenth (June 19, observed)
    const juneteenth = getObservedDate(new Date(Date.UTC(year, 5, 19)));
    holidays.set(fmt(juneteenth), { isHoliday: true, isEarlyClose: false, name: "Juneteenth", note: "Markets closed" });

    // Independence Day (July 4, observed)
    const july4 = new Date(Date.UTC(year, 6, 4));
    const july4Observed = getObservedDate(july4);
    holidays.set(fmt(july4Observed), { isHoliday: true, isEarlyClose: false, name: "Independence Day", note: "Markets closed" });

    // Day before July 4th - early close if July 4 is not on Monday/Saturday
    const july3 = new Date(Date.UTC(year, 6, 3));
    if (july4.getUTCDay() !== 1 && july4.getUTCDay() !== 6 && july3.getUTCDay() !== 0 && july3.getUTCDay() !== 6) {
        holidays.set(fmt(july3), { isHoliday: false, isEarlyClose: true, name: "Independence Day Eve", note: "Early close at 1pm ET" });
    }

    // Labor Day (1st Monday of September)
    const laborDay = getNthWeekdayOfMonth(year, 8, 1, 1);
    holidays.set(fmt(laborDay), { isHoliday: true, isEarlyClose: false, name: "Labor Day", note: "Markets closed" });

    // Thanksgiving (4th Thursday of November)
    const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
    holidays.set(fmt(thanksgiving), { isHoliday: true, isEarlyClose: false, name: "Thanksgiving", note: "Markets closed" });

    // Black Friday (Day after Thanksgiving) - early close
    const blackFriday = new Date(Date.UTC(thanksgiving.getUTCFullYear(), thanksgiving.getUTCMonth(), thanksgiving.getUTCDate() + 1));
    holidays.set(fmt(blackFriday), { isHoliday: false, isEarlyClose: true, name: "Black Friday", note: "Early close at 1pm ET - partial data expected" });

    // Christmas (Dec 25, observed)
    const christmas = new Date(Date.UTC(year, 11, 25));
    const christmasObserved = getObservedDate(christmas);
    holidays.set(fmt(christmasObserved), { isHoliday: true, isEarlyClose: false, name: "Christmas Day", note: "Markets closed" });

    // Christmas Eve - early close if it's a weekday and not the observed Christmas
    const christmasEve = new Date(Date.UTC(year, 11, 24));
    if (christmasEve.getUTCDay() !== 0 && christmasEve.getUTCDay() !== 6 && fmt(christmasEve) !== fmt(christmasObserved)) {
        holidays.set(fmt(christmasEve), { isHoliday: false, isEarlyClose: true, name: "Christmas Eve", note: "Early close at 1pm ET" });
    }

    return holidays;
};

// Cache holidays for multiple years
const holidayCache = new Map<number, Map<string, MarketDay>>();
const getHolidaysForYear = (year: number): Map<string, MarketDay> => {
    if (!holidayCache.has(year)) {
        holidayCache.set(year, generateNYSEHolidays(year));
    }
    return holidayCache.get(year)!;
};

// Get market day info for a specific date
const getMarketDayInfo = (dateStr: string): MarketDay | null => {
    const year = parseInt(dateStr.substring(0, 4));
    const holidays = getHolidaysForYear(year);
    return holidays.get(dateStr) || null;
};

// Check if a date is a weekend (Sat=6, Sun=0)
const isWeekend = (date: Date): boolean => {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
};

// Check if a date is a US market holiday
const isMarketHoliday = (dateStr: string): boolean => {
    const info = getMarketDayInfo(dateStr);
    return info?.isHoliday === true;
};

// Check if a date is an early close day
const isEarlyClose = (dateStr: string): boolean => {
    const info = getMarketDayInfo(dateStr);
    return info?.isEarlyClose === true;
};

// Get the status of a day for display
const getDayStatus = (dateStr: string, date: Date, hasData: boolean, isToday: boolean): 'trading' | 'weekend' | 'holiday' | 'early_close' | 'pending' => {
    if (hasData) return 'trading';
    if (isWeekend(date)) return 'weekend';
    if (isMarketHoliday(dateStr)) return 'holiday';
    if (isEarlyClose(dateStr)) return 'early_close';
    if (isToday) return 'pending';
    return 'pending'; // Trading day without data yet (could be after hours)
};

// Fill in missing dates from first data point to today
const fillMissingDates = (flows: ETFFlow[]): ETFFlow[] => {
    if (flows.length === 0) return [];

    // Create a map of existing data by date
    const flowMap = new Map<string, ETFFlow>();
    flows.forEach(f => flowMap.set(f.date, f));

    // Get today's date in UTC
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Start from the first data point
    const startDate = new Date(flows[0].timestamp);
    startDate.setUTCHours(0, 0, 0, 0);

    // End at today
    const endDate = new Date(todayStr);
    endDate.setUTCHours(0, 0, 0, 0);

    const filledFlows: ETFFlow[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const existingFlow = flowMap.get(dateStr);

        const marketDayInfo = getMarketDayInfo(dateStr);

        if (existingFlow) {
            // Use existing data, mark as trading day (or early_close if applicable)
            filledFlows.push({
                ...existingFlow,
                dayStatus: marketDayInfo?.isEarlyClose ? 'early_close' : 'trading',
                dayName: marketDayInfo?.name,
                dayNote: marketDayInfo?.note
            });
        } else {
            // Create placeholder for missing date
            const dayStatus = getDayStatus(dateStr, currentDate, false, isToday);
            filledFlows.push({
                date: dateStr,
                timestamp: currentDate.getTime(),
                net_flow: 0,
                price_usd: 0,
                etf_breakdown: [],
                displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
                dayStatus,
                dayName: marketDayInfo?.name,
                dayNote: marketDayInfo?.note
            });
        }

        // Move to next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return filledFlows;
};

// Known ETFs with their colors and institutions
const KNOWN_ETF_INFO: { [key: string]: { color: string; institution: string } } = {
    'XRPC': { color: '#10B981', institution: 'Canary Capital' },
    'XRPZ': { color: '#3B82F6', institution: 'Franklin Templeton' },
    'XRP': { color: '#F59E0B', institution: 'Bitwise' },
    'GXRP': { color: '#8B5CF6', institution: 'Grayscale' },
};

// Color palette for dynamically discovered ETFs (new launches)
const DYNAMIC_ETF_COLORS = [
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#A855F7', // Purple
    '#EF4444', // Red
    '#0EA5E9', // Sky
    '#22D3EE', // Light Cyan
    '#FBBF24', // Amber
    '#D946EF', // Fuchsia
    '#2DD4BF', // Teal light
];

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

// Custom X-axis tick to show labels with rotation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={12} textAnchor="end" fill="#9CA3AF" fontSize={9} transform="rotate(-35)">
                {payload?.value}
            </text>
        </g>
    );
};

// Calculate smart X-axis interval based on data points
const getXAxisInterval = (dataLength: number): number | 'preserveStartEnd' => {
    if (dataLength <= 14) return 0; // Show all labels for 2 weeks or less
    if (dataLength <= 30) return 1; // Every other label for a month
    if (dataLength <= 90) return Math.floor(dataLength / 15); // ~15 labels for 3 months
    if (dataLength <= 365) return Math.floor(dataLength / 12); // ~12 labels for a year
    return Math.floor(dataLength / 12); // ~12 labels for any longer period
};

// Custom tooltip component for ETF flow charts
const CustomTooltip = ({ active, payload, label, formatFlow, etfInfo, showCumulative, showBTCComparison, showETHComparison }: {
    active?: boolean;
    payload?: Array<{ payload: ETFFlow & { displayDate: string; btc_daily_flow?: number | null; btc_cumulative_flow?: number | null; eth_daily_flow?: number | null; eth_cumulative_flow?: number | null } }>;
    label?: string;
    formatFlow: (num: number) => string;
    etfInfo: { [key: string]: { color: string; institution: string } };
    showCumulative?: boolean;
    showBTCComparison?: boolean;
    showETHComparison?: boolean;
}) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const netFlow = data.net_flow;
    const cumulativeFlow = data.cumulative_flow || 0;
    const btcDailyFlow = data.btc_daily_flow;
    const btcCumulativeFlow = data.btc_cumulative_flow;
    const ethDailyFlow = data.eth_daily_flow;
    const ethCumulativeFlow = data.eth_cumulative_flow;
    const etfBreakdown = data.etf_breakdown || [];
    const dayStatus = data.dayStatus;
    const dayName = data.dayName;
    const dayNote = data.dayNote;

    // Status message based on day type
    const getStatusMessage = () => {
        switch (dayStatus) {
            case 'weekend': return { text: 'Weekend - Market Closed', color: '#6B7280' };
            case 'holiday': return { text: dayName ? `${dayName} - Market Closed` : 'Holiday - Market Closed', color: '#FBBF24' };
            case 'early_close': return { text: dayName ? `${dayName} - Early Close (1pm ET)` : 'Early Close (1pm ET)', color: '#F59E0B', showData: true };
            case 'pending': return { text: 'Data Pending', color: '#60A5FA' };
            default: return null;
        }
    };
    const statusMessage = getStatusMessage();

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
                {dayName && <div style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 400, marginTop: '2px' }}>{dayName}</div>}
            </div>
            {statusMessage && !(statusMessage as { showData?: boolean }).showData ? (
                <div style={{ color: statusMessage.color, fontSize: '13px', fontWeight: 500 }}>
                    {statusMessage.text}
                    {dayNote && <div style={{ color: '#6B7280', fontSize: '11px', marginTop: '4px' }}>{dayNote}</div>}
                </div>
            ) : (
                <>
                    {statusMessage && (statusMessage as { showData?: boolean }).showData && (
                        <div style={{ color: statusMessage.color, fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
                            {statusMessage.text}
                            {dayNote && <div style={{ color: '#6B7280', fontSize: '10px', marginTop: '2px' }}>{dayNote}</div>}
                        </div>
                    )}
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Net Flow: </span>
                        <span style={{ color: netFlow >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            {netFlow >= 0 ? '+' : ''}${formatFlow(netFlow)}
                        </span>
                    </div>
                    {showCumulative && (
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>XRP Cumulative: </span>
                            <span style={{ color: cumulativeFlow >= 0 ? '#60A5FA' : '#f87171', fontWeight: 600 }}>
                                {cumulativeFlow >= 0 ? '+' : ''}${formatFlow(cumulativeFlow)}
                            </span>
                        </div>
                    )}
                    {showBTCComparison && showCumulative && btcCumulativeFlow !== null && btcCumulativeFlow !== undefined && (
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>BTC ETF (same day): </span>
                            <span style={{ color: btcDailyFlow !== null && btcDailyFlow !== undefined && btcDailyFlow >= 0 ? '#F97316' : '#f87171', fontWeight: 600 }}>
                                {btcDailyFlow !== null && btcDailyFlow !== undefined ? `${btcDailyFlow >= 0 ? '+' : '-'}$${formatFlow(Math.abs(btcDailyFlow))}` : 'N/A'}
                            </span>
                            <div style={{ marginLeft: '0px', marginTop: '2px' }}>
                                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Cumulative: </span>
                                <span style={{ color: btcCumulativeFlow >= 0 ? '#F97316' : '#f87171', fontWeight: 600 }}>
                                    {btcCumulativeFlow >= 0 ? '+' : ''}${formatFlow(btcCumulativeFlow)}
                                </span>
                            </div>
                        </div>
                    )}
                    {showETHComparison && showCumulative && ethCumulativeFlow !== null && ethCumulativeFlow !== undefined && (
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>ETH ETF (same day): </span>
                            <span style={{ color: ethDailyFlow !== null && ethDailyFlow !== undefined && ethDailyFlow >= 0 ? '#A855F7' : '#f87171', fontWeight: 600 }}>
                                {ethDailyFlow !== null && ethDailyFlow !== undefined ? `${ethDailyFlow >= 0 ? '+' : '-'}$${formatFlow(Math.abs(ethDailyFlow))}` : 'N/A'}
                            </span>
                            <div style={{ marginLeft: '0px', marginTop: '2px' }}>
                                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Cumulative: </span>
                                <span style={{ color: ethCumulativeFlow >= 0 ? '#A855F7' : '#f87171', fontWeight: 600 }}>
                                    {ethCumulativeFlow >= 0 ? '+' : ''}${formatFlow(ethCumulativeFlow)}
                                </span>
                            </div>
                        </div>
                    )}
                    {data.price_usd && data.price_usd > 0 && (
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
                                            backgroundColor: etfInfo[etf.ticker]?.color || '#6B7280'
                                        }} />
                                        <span style={{ color: 'white', fontSize: '12px' }}>{etf.ticker}</span>
                                        <span style={{ color: '#6B7280', fontSize: '10px' }}>{etfInfo[etf.ticker]?.institution}</span>
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
                </>
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
    const [inflow7d, setInflow7d] = useState(0);
    const [outflow7d, setOutflow7d] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartTypeState] = useState<ChartType>('composed');
    const [showMockData, setShowMockData] = useState(false);
    const [timeRange, setTimeRangeState] = useState<TimeRange>('all');
    const [showCumulative, setShowCumulative] = useState(true);
    const [showPriceLine, setShowPriceLine] = useState(false);
    const [showBTCComparison, setShowBTCComparison] = useState(false);
    const [showETHComparison, setShowETHComparison] = useState(false);
    const [btcComparisonData, setBtcComparisonData] = useState<{ day: number; net_flow: number; cumulative_flow: number }[] | null>(null);
    const [ethComparisonData, setEthComparisonData] = useState<{ day: number; net_flow: number; cumulative_flow: number }[] | null>(null);
    const [btcTotalCumulative, setBtcTotalCumulative] = useState<number | null>(null);
    const [ethTotalCumulative, setEthTotalCumulative] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [exchangeHistory, setExchangeHistory] = useState<ExchangeHistoryData | null>(null);
    const [reserveTimeRange, setReserveTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('all');

    // Zoom state for ETF chart (indices into displayData)
    const [zoomStart, setZoomStart] = useState<number | null>(null);
    const [zoomEnd, setZoomEnd] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartZoom, setDragStartZoom] = useState<{ start: number; end: number } | null>(null);
    const [chartContainer, setChartContainer] = useState<HTMLDivElement | null>(null);
    const chartContainerRef = useCallback((node: HTMLDivElement | null) => {
        setChartContainer(node);
    }, []);

    // URL param helpers - update URL when chart state changes
    const updateURL = useCallback((chart: ChartType, range: TimeRange) => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams();
        if (chart !== 'composed') params.set('chart', chart);
        if (range !== 'all') params.set('range', range);
        const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    }, []);

    const setChartType = useCallback((type: ChartType) => {
        setChartTypeState(prev => {
            updateURL(type, timeRange);
            return type;
        });
    }, [timeRange, updateURL]);

    const setTimeRange = useCallback((range: TimeRange) => {
        setTimeRangeState(prev => {
            updateURL(chartType, range);
            return range;
        });
    }, [chartType, updateURL]);

    // Initialize from URL params on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const chartParam = params.get('chart') as ChartType | null;
        const rangeParam = params.get('range') as TimeRange | null;

        if (chartParam && ['composed', 'bar', 'area', 'line'].includes(chartParam)) {
            setChartTypeState(chartParam);
        }
        if (rangeParam && ['daily', 'weekly', 'monthly', 'yearly', 'all'].includes(rangeParam)) {
            setTimeRangeState(rangeParam);
        }
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();

            // Chart type shortcuts: 1-4
            if (key === '1') setChartType('composed');
            else if (key === '2') setChartType('bar');
            else if (key === '3') setChartType('area');
            else if (key === '4') setChartType('line');

            // Time range shortcuts: d, w, m, y, a
            else if (key === 'd') setTimeRange('daily');
            else if (key === 'w') setTimeRange('weekly');
            else if (key === 'm') setTimeRange('monthly');
            else if (key === 'y') setTimeRange('yearly');
            else if (key === 'a') setTimeRange('all');

            // Toggle cumulative: c, price: p
            else if (key === 'c') setShowCumulative(prev => !prev);
            else if (key === 'p') setShowPriceLine(prev => !prev);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setChartType, setTimeRange]);

    // Build dynamic ETF info map that includes any new ETFs from API data
    const dynamicETFInfo = useMemo(() => {
        const info: { [key: string]: { color: string; institution: string } } = { ...KNOWN_ETF_INFO };

        // Collect all unique tickers from the data
        const allTickers = new Set<string>();
        etfFlows.forEach(flow => {
            flow.etf_breakdown?.forEach(etf => {
                allTickers.add(etf.ticker);
            });
        });

        // Assign colors to unknown tickers (new ETF launches)
        let colorIndex = 0;
        allTickers.forEach(ticker => {
            if (!info[ticker]) {
                info[ticker] = {
                    color: DYNAMIC_ETF_COLORS[colorIndex % DYNAMIC_ETF_COLORS.length],
                    institution: ticker // Use ticker as placeholder until we know the institution
                };
                colorIndex++;
            }
        });

        return info;
    }, [etfFlows]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch exchange history (separate, less frequent)
    useEffect(() => {
        const fetchExchangeHistory = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/xrp-exchange-balance-history`);
                if (res.ok) {
                    const data = await res.json();
                    setExchangeHistory(data);
                }
            } catch (err) {
                console.error('Error fetching exchange history:', err);
            }
        };
        fetchExchangeHistory();
    }, []);

    // Fetch BTC ETF comparison data when toggle is enabled
    useEffect(() => {
        if (!showBTCComparison) return;
        if (btcComparisonData) return; // Already fetched

        const fetchBTCData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/btc-etf-flows`);
                if (res.ok) {
                    const data = await res.json();
                    setBtcComparisonData(data.flows || []);
                    setBtcTotalCumulative(data.total_cumulative || null);
                }
            } catch (err) {
                console.error('Error fetching BTC ETF data:', err);
            }
        };
        fetchBTCData();
    }, [showBTCComparison, btcComparisonData]);

    // Fetch ETH ETF comparison data when toggle is enabled
    useEffect(() => {
        if (!showETHComparison) return;
        if (ethComparisonData) return; // Already fetched

        const fetchETHData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/eth-etf-flows`);
                if (res.ok) {
                    const data = await res.json();
                    setEthComparisonData(data.flows || []);
                    setEthTotalCumulative(data.total_cumulative || null);
                }
            } catch (err) {
                console.error('Error fetching ETH ETF data:', err);
            }
        };
        fetchETHData();
    }, [showETHComparison, ethComparisonData]);

    const fetchData = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const [etfRes, pricesRes, exchangeRes, volume7dRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/xrp-etf-flows`, { signal: controller.signal }),
                fetch(`${API_BASE_URL}/api/prices`, { signal: controller.signal }),
                fetch(`${API_BASE_URL}/api/xrp-exchange-balances`, { signal: controller.signal }),
                fetch(`${API_BASE_URL}/api/xrp-7d-volume`, { signal: controller.signal })
            ]);
            clearTimeout(timeoutId);

            // Parse 7d volume first so we can include it in priceData
            let volume7d: number | null = null;
            if (volume7dRes.ok) {
                const volume7dData = await volume7dRes.json();
                volume7d = volume7dData.volume_7d || null;
            }

            if (etfRes.ok) {
                const flows = await etfRes.json();
                if (flows.length > 0) {
                    // Sort by date ascending for chart
                    const sorted = [...flows].sort((a, b) => a.timestamp - b.timestamp);
                    // Format dates for display (use UTC to avoid timezone shift)
                    const formatted = sorted.map(f => ({
                        ...f,
                        displayDate: new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                    }));

                    // Fill in missing dates (weekends, holidays) and extend to today
                    const filledData = fillMissingDates(formatted);
                    setEtfFlows(filledData);

                    // Calculate stats from actual trading data only
                    const tradingDays = filledData.filter(f => f.dayStatus === 'trading');
                    const inflow = tradingDays.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0);
                    const outflow = Math.abs(tradingDays.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0));
                    const avgDailyInflow = tradingDays.length > 0 ? inflow / tradingDays.length : 0;
                    // Get latest trading day's flow (last entry with actual data)
                    const latestTradingDay = tradingDays.length > 0 ? tradingDays[tradingDays.length - 1] : null;
                    const latestDayFlow = latestTradingDay?.net_flow || 0;

                    // Calculate 7d flows (last 7 trading days)
                    const now = Date.now();
                    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
                    const last7dTradingDays = tradingDays.filter(f => f.timestamp >= sevenDaysAgo);
                    const inflow7dCalc = last7dTradingDays.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0);
                    const outflow7dCalc = Math.abs(last7dTradingDays.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0));

                    setTotalInflow(inflow);
                    setTotalOutflow(outflow);
                    setAvgDailyInflow(avgDailyInflow);
                    setDaysTracked(tradingDays.length);
                    setDailyInflow(latestDayFlow);
                    setInflow7d(inflow7dCalc);
                    setOutflow7d(outflow7dCalc);
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
                        price_change_24h: parseFloat(xrp.price_change_24h) || 0,
                        price_change_7d: xrp.price_change_7d ? parseFloat(xrp.price_change_7d) : null,
                        volume_7d: volume7d
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

    // Filter data based on time range and calculate cumulative flows
    const displayData = useMemo(() => {
        let filteredData = baseData;

        if (timeRange !== 'all' && baseData.length > 0) {
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
                    break;
            }

            if (cutoffDate!) {
                filteredData = baseData.filter(flow => new Date(flow.timestamp) >= cutoffDate);
            }
        }

        // Create maps of BTC and ETH flows by day index (both daily and cumulative)
        const btcByDay = new Map<number, { daily: number; cumulative: number }>();
        if (btcComparisonData) {
            btcComparisonData.forEach(d => {
                btcByDay.set(d.day, { daily: d.net_flow, cumulative: d.cumulative_flow });
            });
        }
        const ethByDay = new Map<number, { daily: number; cumulative: number }>();
        if (ethComparisonData) {
            ethComparisonData.forEach(d => {
                ethByDay.set(d.day, { daily: d.net_flow, cumulative: d.cumulative_flow });
            });
        }

        // Calculate cumulative flows (only for trading days)
        // Also map BTC/ETH comparison data by day index (day 0 = ETF launch)
        let cumulative = 0;
        return filteredData.map((flow, index) => {
            if (flow.dayStatus === 'trading') {
                cumulative += flow.net_flow;
            }
            // Get BTC/ETH flows for the same day index from start
            const btcData = btcByDay.get(index);
            const ethData = ethByDay.get(index);
            return {
                ...flow,
                cumulative_flow: cumulative,
                btc_daily_flow: btcData?.daily ?? null,
                btc_cumulative_flow: btcData?.cumulative ?? null,
                eth_daily_flow: ethData?.daily ?? null,
                eth_cumulative_flow: ethData?.cumulative ?? null
            };
        });
    }, [baseData, timeRange, btcComparisonData, ethComparisonData]);

    // Compute cumulative totals at the same number of trading days as XRP ETF
    const sameDayBTCCumulative = useMemo(() => {
        if (!displayData.length || !btcComparisonData) return null;
        // Find the last non-null BTC cumulative in displayData
        for (let i = displayData.length - 1; i >= 0; i--) {
            if (displayData[i].btc_cumulative_flow !== null && displayData[i].btc_cumulative_flow !== undefined) {
                return displayData[i].btc_cumulative_flow;
            }
        }
        return null;
    }, [displayData, btcComparisonData]);

    const sameDayETHCumulative = useMemo(() => {
        if (!displayData.length || !ethComparisonData) return null;
        // Find the last non-null ETH cumulative in displayData
        for (let i = displayData.length - 1; i >= 0; i--) {
            if (displayData[i].eth_cumulative_flow !== null && displayData[i].eth_cumulative_flow !== undefined) {
                return displayData[i].eth_cumulative_flow;
            }
        }
        return null;
    }, [displayData, ethComparisonData]);

    // Reset zoom when timeRange changes
    useEffect(() => {
        setZoomStart(null);
        setZoomEnd(null);
    }, [timeRange]);

    // Zoomed/sliced data for chart display
    const zoomedDisplayData = useMemo(() => {
        if (zoomStart === null || zoomEnd === null) return displayData;
        return displayData.slice(zoomStart, zoomEnd + 1);
    }, [displayData, zoomStart, zoomEnd]);

    // Check if zoomed
    const isZoomed = zoomStart !== null && zoomEnd !== null;

    // Zoom percentage indicator
    const zoomPercentage = useMemo(() => {
        if (!isZoomed || displayData.length === 0) return 100;
        const visibleCount = (zoomEnd! - zoomStart! + 1);
        return Math.round((visibleCount / displayData.length) * 100);
    }, [isZoomed, zoomStart, zoomEnd, displayData.length]);

    // Handle pan (drag)
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        setIsDragging(true);
        setDragStartX(e.clientX);
        setDragStartZoom({ start: zoomStart!, end: zoomEnd! });
    }, [isZoomed, zoomStart, zoomEnd]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !dragStartZoom || !chartContainer) return;

        const rect = chartContainer.getBoundingClientRect();
        const deltaX = e.clientX - dragStartX;
        const visibleCount = dragStartZoom.end - dragStartZoom.start + 1;
        const pixelsPerBar = rect.width / visibleCount;
        const barsDelta = Math.round(-deltaX / pixelsPerBar);

        let newStart = dragStartZoom.start + barsDelta;
        let newEnd = dragStartZoom.end + barsDelta;

        // Clamp to bounds
        if (newStart < 0) {
            newEnd -= newStart;
            newStart = 0;
        }
        if (newEnd >= displayData.length) {
            newStart -= (newEnd - displayData.length + 1);
            newEnd = displayData.length - 1;
        }

        newStart = Math.max(0, newStart);
        newEnd = Math.min(displayData.length - 1, newEnd);

        setZoomStart(newStart);
        setZoomEnd(newEnd);
    }, [isDragging, dragStartX, dragStartZoom, displayData.length, chartContainer]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragStartZoom(null);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            setDragStartZoom(null);
        }
    }, [isDragging]);

    // Reset zoom function
    const resetZoom = useCallback(() => {
        setZoomStart(null);
        setZoomEnd(null);
    }, []);

    // Refs to hold current values for wheel handler (avoids stale closures)
    const zoomStateRef = useRef({ zoomStart, zoomEnd, dataLength: displayData.length });
    useEffect(() => {
        zoomStateRef.current = { zoomStart, zoomEnd, dataLength: displayData.length };
    }, [zoomStart, zoomEnd, displayData.length]);

    // Native wheel event handler for zoom (passive: false to allow preventDefault)
    // Uses callback ref (chartContainer state) to properly detect when element mounts
    useEffect(() => {
        if (!chartContainer) return;

        const handleWheel = (e: WheelEvent) => {
            const { zoomStart: currentZoomStart, zoomEnd: currentZoomEnd, dataLength } = zoomStateRef.current;

            if (dataLength < 7) return;

            e.preventDefault();
            e.stopPropagation();

            const MIN_VISIBLE = 7;
            const ZOOM_SPEED = 0.15;

            const currentStart = currentZoomStart ?? 0;
            const currentEnd = currentZoomEnd ?? dataLength - 1;
            const visibleCount = currentEnd - currentStart + 1;

            const rect = chartContainer.getBoundingClientRect();
            const mouseXRatio = (e.clientX - rect.left) / rect.width;

            if (e.deltaY < 0) {
                // Zoom in
                const zoomAmount = Math.max(1, Math.floor(visibleCount * ZOOM_SPEED));
                if (visibleCount <= MIN_VISIBLE) return;

                const leftZoom = Math.floor(zoomAmount * mouseXRatio);
                const rightZoom = zoomAmount - leftZoom;

                const newStart = Math.min(currentStart + leftZoom, currentEnd - MIN_VISIBLE + 1);
                const newEnd = Math.max(currentEnd - rightZoom, currentStart + MIN_VISIBLE - 1);

                setZoomStart(Math.max(0, newStart));
                setZoomEnd(Math.min(dataLength - 1, newEnd));
            } else {
                // Zoom out
                if (visibleCount >= dataLength) {
                    setZoomStart(null);
                    setZoomEnd(null);
                    return;
                }

                const zoomAmount = Math.max(1, Math.floor(visibleCount * ZOOM_SPEED));
                const leftZoom = Math.floor(zoomAmount * mouseXRatio);
                const rightZoom = zoomAmount - leftZoom;

                const newStart = currentStart - leftZoom;
                const newEnd = currentEnd + rightZoom;

                if (newStart <= 0 && newEnd >= dataLength - 1) {
                    setZoomStart(null);
                    setZoomEnd(null);
                } else {
                    setZoomStart(Math.max(0, newStart));
                    setZoomEnd(Math.min(dataLength - 1, newEnd));
                }
            }
        };

        chartContainer.addEventListener('wheel', handleWheel, { passive: false });
        return () => chartContainer.removeEventListener('wheel', handleWheel);
    }, [chartContainer]); // Re-attach when container element changes

    // CSV Export function
    const handleExportCSV = useCallback(() => {
        if (!displayData || displayData.length === 0) return;

        const headers = ['Date', 'Net Flow (USD)', 'Cumulative Flow (USD)', 'Day Status'];
        const rows = displayData.map(flow => [
            flow.date,
            flow.net_flow.toFixed(2),
            (flow.cumulative_flow || 0).toFixed(2),
            flow.dayStatus || 'trading'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `xrp-etf-flows-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [displayData, timeRange]);

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

    // Get latest ETF breakdown from most recent trading day (not weekend/holiday)
    const latestTradingDayData = useMemo(() => {
        const tradingDays = etfFlows.filter(f => f.dayStatus === 'trading');
        return tradingDays.length > 0 ? tradingDays[tradingDays.length - 1] : null;
    }, [etfFlows]);

    const latestETFBreakdown = latestTradingDayData?.etf_breakdown?.filter(e => e.flow_usd > 0) || [];

    // Filter exchange history by time range and ensure it ends with today
    const filteredExchangeHistory = useMemo(() => {
        if (!exchangeHistory?.history) return [];
        let history = [...exchangeHistory.history];

        // Add today's data point if not present (using current exchange totals)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastDataDate = history.length > 0 ? history[history.length - 1].date : null;

        if (lastDataDate !== todayStr && exchangeData?.totals?.balance) {
            history.push({
                date: todayStr,
                timestamp: today.getTime(),
                total: exchangeData.totals.balance,
                exchanges: {}
            });
        }

        // For 'all', return full history from the earliest available date
        if (reserveTimeRange === 'all') return history;

        const now = Date.now();
        let cutoff: number;
        switch (reserveTimeRange) {
            case '30d': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
            case '90d': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
            case '1y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
            default: return history;
        }
        return history.filter(h => h.timestamp >= cutoff);
    }, [exchangeHistory, reserveTimeRange, exchangeData?.totals?.balance]);

    // Generate Twitter share text
    const generateShareText = () => {
        const latestFlow = displayDailyInflow;
        const flowDirection = latestFlow >= 0 ? 'inflow' : 'outflow';
        const flowAmount = formatFlow(Math.abs(latestFlow));
        const price = priceData?.price_usd.toFixed(4) || 'N/A';
        const priceChange = priceData?.price_change_24h?.toFixed(2) || '0';
        const priceEmoji = parseFloat(priceChange) >= 0 ? '📈' : '📉';

        const text = `🚀 #XRP ETF Update

💰 Latest: ${latestFlow >= 0 ? '+' : '-'}$${flowAmount} ${flowDirection}
📊 Net Total: ${netFlow >= 0 ? '+' : ''}$${formatFlow(netFlow)}
${priceEmoji} Price: $${price} (${parseFloat(priceChange) >= 0 ? '+' : ''}${priceChange}%)

Track XRP institutional flows live 👇
https://isoeagle.io

#XRPETF #Crypto #Ripple`;

        return encodeURIComponent(text);
    };

    const handleTwitterShare = () => {
        const shareText = generateShareText();
        window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank', 'width=550,height=420');
    };

    const handleCopyShare = async () => {
        const latestFlow = displayDailyInflow;
        const flowDirection = latestFlow >= 0 ? 'inflow' : 'outflow';
        const flowAmount = formatFlow(Math.abs(latestFlow));
        const price = priceData?.price_usd.toFixed(4) || 'N/A';
        const priceChange = priceData?.price_change_24h?.toFixed(2) || '0';
        const priceEmoji = parseFloat(priceChange) >= 0 ? '📈' : '📉';

        const text = `🚀 XRP ETF Update

💰 Latest: ${latestFlow >= 0 ? '+' : '-'}$${flowAmount} ${flowDirection}
📊 Net Total: ${netFlow >= 0 ? '+' : ''}$${formatFlow(netFlow)}
${priceEmoji} Price: $${price} (${parseFloat(priceChange) >= 0 ? '+' : ''}${priceChange}%)

Track XRP institutional flows live 👇
https://isoeagle.io`;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0">
                            <img
                                src="/xrplogo.png"
                                alt="XRP"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-3xl font-bold text-white">XRP ETF Monitor</h1>
                            <p className="text-blue-100 text-xs sm:text-base truncate">Real-time institutional flow tracking</p>
                        </div>
                    </div>
                    {/* Share Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Copy to Clipboard Button */}
                        <button
                            onClick={handleCopyShare}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 hover:bg-black/50 border border-white/20 hover:border-white/40 rounded-lg sm:rounded-xl transition-all duration-200 group"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">
                                {copied ? 'Copied!' : 'Copy'}
                            </span>
                        </button>
                        {/* Twitter Share Button */}
                        <button
                            onClick={handleTwitterShare}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 hover:bg-black/50 border border-white/20 hover:border-white/40 rounded-lg sm:rounded-xl transition-all duration-200 group"
                            title="Share on X/Twitter"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">Share</span>
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <div className="text-blue-100 text-xs sm:text-sm mb-1">Current Price</div>
                        <div className="text-lg sm:text-2xl font-bold text-white">
                            ${priceData?.price_usd.toFixed(4) || '-'}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                            <div className="flex justify-between items-center">
                                <div className="text-blue-100 text-[10px] sm:text-xs">24h</div>
                                {priceData && priceData.price_change_24h !== 0 ? (
                                    <span className={`text-xs sm:text-sm font-bold ${priceData.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {priceData.price_change_24h >= 0 ? '+' : ''}{priceData.price_change_24h.toFixed(2)}%
                                    </span>
                                ) : (
                                    <span className="text-xs sm:text-sm text-zinc-400">-</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-blue-100 text-[10px] sm:text-xs">7d</div>
                                {priceData && priceData.price_change_7d !== null ? (
                                    <span className={`text-xs sm:text-sm font-bold ${priceData.price_change_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {priceData.price_change_7d >= 0 ? '+' : ''}{priceData.price_change_7d.toFixed(2)}%
                                    </span>
                                ) : (
                                    <span className="text-xs sm:text-sm text-zinc-400">-</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <div className="text-blue-100 text-xs sm:text-sm mb-1">Market Cap</div>
                        <div className="text-lg sm:text-2xl font-bold text-white">
                            {priceData ? formatNumber(priceData.market_cap) : '-'}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                            <div className="flex justify-between items-center">
                                <div className="text-blue-100 text-[10px] sm:text-xs">24h Vol</div>
                                <span className="text-xs sm:text-sm font-semibold text-white">
                                    {priceData ? formatNumber(priceData.volume_24h) : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-blue-100 text-[10px] sm:text-xs">7d Vol</div>
                                <span className="text-xs sm:text-sm font-semibold text-white">
                                    {priceData && priceData.volume_7d !== null ? formatNumber(priceData.volume_7d) : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-400/30">
                        <div className="text-green-200 text-xs sm:text-sm mb-1">Total ETF Inflows</div>
                        <div className="text-lg sm:text-2xl font-bold text-green-400">
                            +${formatFlow(displayTotalInflow)}
                        </div>
                        <div className="mt-2 pt-2 border-t border-green-500/20 space-y-1">
                            <div className="flex justify-between items-center">
                                <div className="text-green-200 text-[10px] sm:text-xs">24h</div>
                                <div className={`text-xs sm:text-sm font-bold ${displayDailyInflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {displayDailyInflow >= 0 ? '+' : ''}${formatFlow(Math.max(0, displayDailyInflow))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-green-200 text-[10px] sm:text-xs">7d</div>
                                <div className="text-xs sm:text-sm font-bold text-green-400">
                                    +${formatFlow(inflow7d)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-400/30">
                        <div className="text-red-200 text-xs sm:text-sm mb-1">Total ETF Outflows</div>
                        <div className="text-lg sm:text-2xl font-bold text-red-400">
                            -${formatFlow(displayTotalOutflow)}
                        </div>
                        <div className="mt-2 pt-2 border-t border-red-500/20 space-y-1">
                            <div className="flex justify-between items-center">
                                <div className="text-red-200 text-[10px] sm:text-xs">24h</div>
                                <div className={`text-xs sm:text-sm font-bold ${displayDailyInflow < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                    {displayDailyInflow < 0 ? `-$${formatFlow(Math.abs(displayDailyInflow))}` : '$0'}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-red-200 text-[10px] sm:text-xs">7d</div>
                                <div className="text-xs sm:text-sm font-bold text-red-400">
                                    -${formatFlow(outflow7d)}
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
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl border border-zinc-700/50 backdrop-blur">
                <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                XRP ETF Daily Flows
                            </h2>
                            <p className="text-zinc-400 text-xs sm:text-sm mt-1">Net inflows and outflows (USD)</p>
                        </div>
                        <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-sm sm:text-base self-start sm:self-auto ${netFlow >= 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            Net: {netFlow >= 0 ? '+' : ''}${formatFlow(netFlow)}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Time Range Selector */}
                        <div className="flex bg-zinc-800/80 rounded-lg p-0.5 sm:p-1 border border-zinc-700/50">
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
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
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
                        <div className="flex bg-zinc-800/80 rounded-lg p-0.5 sm:p-1 border border-zinc-700/50">
                            {[
                                { type: 'bar' as ChartType, label: 'Bar' },
                                { type: 'area' as ChartType, label: 'Area' },
                                { type: 'line' as ChartType, label: 'Line' },
                                { type: 'composed' as ChartType, label: 'Mix' },
                            ].map(({ type, label }) => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
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
                        {/* Cumulative Toggle */}
                        <button
                            onClick={() => setShowCumulative(!showCumulative)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 border ${
                                showCumulative
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:text-white hover:bg-zinc-700/50'
                            }`}
                            title="Toggle cumulative total line (C)"
                        >
                            <span className="hidden sm:inline">Cumulative</span>
                            <span className="sm:hidden">&Sigma;</span>
                        </button>
                        {/* Price Line Toggle */}
                        <button
                            onClick={() => setShowPriceLine(!showPriceLine)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 border ${
                                showPriceLine
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:text-white hover:bg-zinc-700/50'
                            }`}
                            title="Toggle XRP price line (P)"
                        >
                            <span className="hidden sm:inline">Price</span>
                            <span className="sm:hidden">$</span>
                        </button>
                        {/* BTC Comparison Toggle */}
                        <button
                            onClick={() => setShowBTCComparison(!showBTCComparison)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 border ${
                                showBTCComparison
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:text-white hover:bg-zinc-700/50'
                            }`}
                            title="Compare with BTC ETF (same day from launch)"
                        >
                            <span className="hidden sm:inline">vs BTC</span>
                            <span className="sm:hidden">BTC</span>
                        </button>
                        {/* ETH Comparison Toggle */}
                        <button
                            onClick={() => setShowETHComparison(!showETHComparison)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 border ${
                                showETHComparison
                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:text-white hover:bg-zinc-700/50'
                            }`}
                            title="Compare with ETH ETF (same day from launch)"
                        >
                            <span className="hidden sm:inline">vs ETH</span>
                            <span className="sm:hidden">ETH</span>
                        </button>
                        {/* Export CSV */}
                        <button
                            onClick={handleExportCSV}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 border bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:text-white hover:bg-zinc-700/50"
                            title="Export data as CSV"
                        >
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </button>
                    </div>
                </div>

                {etfFlows.length > 0 ? (
                    <div className="w-full pl-0 sm:pl-4">
                        {/* Special 1D View - Summary instead of sparse chart */}
                        {timeRange === 'daily' && displayData.length <= 2 ? (
                            <div className="min-h-[280px] sm:h-[380px] flex flex-col justify-center">
                                {displayData.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-0 sm:px-4">
                                        {/* Latest Day Summary */}
                                        <div className="bg-zinc-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-zinc-700">
                                            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Latest Day Flow</h3>
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400 text-sm">Date</span>
                                                    <span className="text-white font-medium text-sm sm:text-base">{displayData[displayData.length - 1]?.displayDate}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400 text-sm">Net Flow</span>
                                                    <span className={`text-lg sm:text-2xl font-bold ${displayData[displayData.length - 1]?.net_flow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {displayData[displayData.length - 1]?.net_flow >= 0 ? '+' : ''}${formatFlow(displayData[displayData.length - 1]?.net_flow || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400 text-sm">XRP Price</span>
                                                    <span className="text-white font-medium text-sm sm:text-base">${displayData[displayData.length - 1]?.price_usd?.toFixed(4) || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ETF Breakdown for the day */}
                                        <div className="bg-zinc-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-zinc-700">
                                            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">ETF Breakdown</h3>
                                            <div className="space-y-2 sm:space-y-3">
                                                {displayData[displayData.length - 1]?.etf_breakdown?.filter(e => e.flow_usd !== 0).map(etf => (
                                                    <div key={etf.ticker} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: dynamicETFInfo[etf.ticker]?.color || '#6B7280' }}
                                                            />
                                                            <span className="text-zinc-300 font-medium text-sm">{etf.ticker}</span>
                                                            <span className="text-zinc-500 text-xs sm:text-sm truncate">{dynamicETFInfo[etf.ticker]?.institution}</span>
                                                        </div>
                                                        <span className={`font-bold text-sm sm:text-base flex-shrink-0 ml-2 ${etf.flow_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {etf.flow_usd >= 0 ? '+' : ''}${formatFlow(etf.flow_usd)}
                                                        </span>
                                                    </div>
                                                )) || (
                                                    <p className="text-zinc-500 text-sm">No ETF breakdown available</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Message about 1D view */}
                                        <div className="md:col-span-2 text-center py-2 sm:py-4">
                                            <p className="text-zinc-500 text-xs sm:text-sm">
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
                        <div
                            ref={chartContainerRef}
                            className={`h-[320px] sm:h-[450px] relative ${isZoomed ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                        >
                        {/* Zoom indicator */}
                        {isZoomed && (
                            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                                <span className="text-xs text-zinc-400 bg-zinc-800/90 px-2 py-1 rounded">
                                    {zoomPercentage}% ({zoomedDisplayData.length} days)
                                </span>
                                <button
                                    onClick={resetZoom}
                                    className="text-xs text-white bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded transition-colors"
                                    title="Reset zoom (scroll down or double-click)"
                                >
                                    Reset
                                </button>
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <ComposedChart data={zoomedDisplayData} margin={{ top: 10, right: (showCumulative || showPriceLine) ? 60 : 10, left: 40, bottom: 30 }}>
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
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={CustomXAxisTick} axisLine={{ stroke: '#4B5563' }} interval={getXAxisInterval(zoomedDisplayData.length)} height={50} />
                                    <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#4B5563' }} />
                                    {showCumulative && (
                                        <YAxis yAxisId="cumulative" orientation="right" stroke="#60A5FA" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 10, fill: '#60A5FA' }} />
                                    )}
                                    {showPriceLine && !showCumulative && (
                                        <YAxis yAxisId="price" orientation="right" stroke="#F59E0B" tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: '#F59E0B' }} domain={['auto', 'auto']} />
                                    )}
                                    {showPriceLine && showCumulative && (
                                        <YAxis yAxisId="price" orientation="right" stroke="#F59E0B" tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: '#F59E0B' }} domain={['auto', 'auto']} hide />
                                    )}
                                    <ReferenceLine y={0} yAxisId="left" stroke="#6B7280" strokeDasharray="3 3" />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} etfInfo={dynamicETFInfo} showCumulative={showCumulative} showBTCComparison={showBTCComparison} showETHComparison={showETHComparison} />} />
                                    <Bar dataKey="net_flow" name="Net Flow" radius={[4, 4, 0, 0]} yAxisId="left">
                                        {zoomedDisplayData.map((entry, index) => {
                                            const isNonTrading = entry.dayStatus === 'weekend' || entry.dayStatus === 'holiday' || entry.dayStatus === 'pending';
                                            const isEarlyClose = entry.dayStatus === 'early_close';
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={isNonTrading ? '#374151' : isEarlyClose ? '#92400E' : (entry.net_flow >= 0 ? 'url(#greenGradient)' : 'url(#redGradient)')}
                                                    stroke={isNonTrading ? '#4B5563' : isEarlyClose ? '#F59E0B' : (entry.net_flow >= 0 ? '#22C55E' : '#EF4444')}
                                                    strokeWidth={isNonTrading ? 1 : 2}
                                                    filter={isNonTrading ? undefined : "url(#glow)"}
                                                    opacity={isNonTrading ? 0.5 : isEarlyClose ? 0.8 : 1}
                                                />
                                            );
                                        })}
                                    </Bar>
                                    {showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative_flow"
                                            stroke="#60A5FA"
                                            strokeWidth={3}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="Cumulative"
                                        />
                                    )}
                                    {showPriceLine && (
                                        <Line
                                            type="monotone"
                                            dataKey="price_usd"
                                            stroke="#F59E0B"
                                            strokeWidth={2}
                                            dot={{ fill: '#F59E0B', strokeWidth: 1, r: 2, stroke: '#1F2937' }}
                                            yAxisId="price"
                                            name="XRP Price"
                                            connectNulls
                                        />
                                    )}
                                    {showBTCComparison && showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="btc_cumulative_flow"
                                            stroke="#F97316"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="BTC ETF (Day from Launch)"
                                            connectNulls
                                        />
                                    )}
                                    {showETHComparison && showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="eth_cumulative_flow"
                                            stroke="#8B5CF6"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="ETH ETF (Day from Launch)"
                                            connectNulls
                                        />
                                    )}
                                </ComposedChart>
                            ) : chartType === 'area' ? (
                                <AreaChart data={zoomedDisplayData} margin={{ top: 10, right: 10, left: 40, bottom: 30 }}>
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
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} etfInfo={dynamicETFInfo} />} />
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
                                <LineChart data={zoomedDisplayData} margin={{ top: 10, right: 10, left: 40, bottom: 30 }}>
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
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} etfInfo={dynamicETFInfo} />} />
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
                                <ComposedChart data={zoomedDisplayData} margin={{ top: 10, right: (showCumulative || showPriceLine) ? 60 : 10, left: 40, bottom: 30 }}>
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
                                    <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    {showCumulative && (
                                        <YAxis yAxisId="cumulative" orientation="right" stroke="#60A5FA" tickFormatter={(v) => `$${formatFlow(v)}`} tick={{ fontSize: 10, fill: '#60A5FA' }} />
                                    )}
                                    {showPriceLine && !showCumulative && (
                                        <YAxis yAxisId="price" orientation="right" stroke="#F59E0B" tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: '#F59E0B' }} domain={['auto', 'auto']} />
                                    )}
                                    {showPriceLine && showCumulative && (
                                        <YAxis yAxisId="price" orientation="right" stroke="#F59E0B" tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: '#F59E0B' }} domain={['auto', 'auto']} hide />
                                    )}
                                    <ReferenceLine y={0} yAxisId="left" stroke="#6B7280" strokeWidth={2} />
                                    <Tooltip content={<CustomTooltip formatFlow={formatFlow} etfInfo={dynamicETFInfo} showCumulative={showCumulative} showBTCComparison={showBTCComparison} showETHComparison={showETHComparison} />} />
                                    <Bar dataKey="net_flow" name="Net Flow" radius={[4, 4, 0, 0]} yAxisId="left">
                                        {zoomedDisplayData.map((entry, index) => {
                                            const isNonTrading = entry.dayStatus === 'weekend' || entry.dayStatus === 'holiday' || entry.dayStatus === 'pending';
                                            const isEarlyClose = entry.dayStatus === 'early_close';
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={isNonTrading ? '#374151' : isEarlyClose ? '#92400E' : (entry.net_flow >= 0 ? 'url(#composedGreenGradient)' : 'url(#composedRedGradient)')}
                                                    stroke={isNonTrading ? '#4B5563' : isEarlyClose ? '#F59E0B' : (entry.net_flow >= 0 ? '#22C55E' : '#EF4444')}
                                                    strokeWidth={isNonTrading ? 1 : 2}
                                                    opacity={isNonTrading ? 0.5 : isEarlyClose ? 0.8 : 1}
                                                />
                                            );
                                        })}
                                    </Bar>
                                    <Line
                                        type="monotone"
                                        dataKey="net_flow"
                                        stroke="#FBBF24"
                                        strokeWidth={3}
                                        dot={{ fill: '#FBBF24', strokeWidth: 2, r: 4, stroke: '#1F2937' }}
                                        yAxisId="left"
                                    />
                                    {showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative_flow"
                                            stroke="#60A5FA"
                                            strokeWidth={3}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="Cumulative"
                                        />
                                    )}
                                    {showPriceLine && (
                                        <Line
                                            type="monotone"
                                            dataKey="price_usd"
                                            stroke="#F59E0B"
                                            strokeWidth={2}
                                            dot={{ fill: '#F59E0B', strokeWidth: 1, r: 2, stroke: '#1F2937' }}
                                            yAxisId="price"
                                            name="XRP Price"
                                            connectNulls
                                        />
                                    )}
                                    {showBTCComparison && showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="btc_cumulative_flow"
                                            stroke="#F97316"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="BTC ETF (Day from Launch)"
                                            connectNulls
                                        />
                                    )}
                                    {showETHComparison && showCumulative && (
                                        <Line
                                            type="monotone"
                                            dataKey="eth_cumulative_flow"
                                            stroke="#8B5CF6"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            yAxisId="cumulative"
                                            name="ETH ETF (Day from Launch)"
                                            connectNulls
                                        />
                                    )}
                                </ComposedChart>
                            ) : null}
                        </ResponsiveContainer>
                        </div>
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
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-zinc-700">
                        <h3 className="text-xs sm:text-sm font-medium text-zinc-400 mb-2 sm:mb-3">Latest Day ETF Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                            {latestETFBreakdown.map(etf => (
                                <div key={etf.ticker} className="flex items-center gap-2 sm:gap-3 bg-zinc-800/50 p-2 sm:p-3 rounded-lg">
                                    <div
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: dynamicETFInfo[etf.ticker]?.color || '#6B7280' }}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <span className="text-xs sm:text-sm font-bold text-white">{etf.ticker}</span>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 hidden sm:inline">•</span>
                                            <span className="text-[10px] sm:text-xs text-zinc-400 truncate hidden sm:inline">{dynamicETFInfo[etf.ticker]?.institution || 'Unknown'}</span>
                                        </div>
                                        <div className="text-xs sm:text-sm font-medium text-green-400">${formatFlow(etf.flow_usd)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ETF Market Hours Note */}
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-green-500 to-green-600"></div>
                            <span className="text-zinc-300">Inflow</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-red-500 to-red-600"></div>
                            <span className="text-zinc-300">Outflow</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-600 opacity-50"></div>
                            <span className="text-zinc-400">Weekend/Holiday</span>
                        </div>
                        {showCumulative && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-0.5 bg-blue-400" style={{ borderTop: '2px dashed #60A5FA' }}></div>
                                <span className="text-blue-400">XRP Cumulative</span>
                            </div>
                        )}
                        {showBTCComparison && showCumulative && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-0.5" style={{ borderTop: '2px dashed #F97316' }}></div>
                                <span className="text-orange-400">BTC ETF (from launch)</span>
                            </div>
                        )}
                        {showETHComparison && showCumulative && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-0.5" style={{ borderTop: '2px dashed #A855F7' }}></div>
                                <span className="text-purple-400">ETH ETF (from launch)</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-zinc-400 mt-2">
                        Gray bars = market closed (weekends/holidays). Orange bars = early close days (1pm ET). Scroll to zoom, drag to pan.
                    </p>
                    {/* Cumulative Totals Comparison */}
                    {showCumulative && (showBTCComparison || showETHComparison) && (
                        <div className="mt-3 pt-3 border-t border-zinc-700/50">
                            <p className="text-[10px] sm:text-xs text-zinc-400 mb-2">Cumulative totals at same # of trading days ({displayData.length} days):</p>
                            <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                                {showBTCComparison && sameDayBTCCumulative !== null && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        <span className="text-zinc-400">BTC ETF:</span>
                                        <span className={`font-semibold ${sameDayBTCCumulative >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                            {sameDayBTCCumulative >= 0 ? '+' : ''}${formatFlow(sameDayBTCCumulative)}
                                        </span>
                                    </div>
                                )}
                                {showETHComparison && sameDayETHCumulative !== null && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="text-zinc-400">ETH ETF:</span>
                                        <span className={`font-semibold ${sameDayETHCumulative >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                            {sameDayETHCumulative >= 0 ? '+' : ''}${formatFlow(sameDayETHCumulative)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Exchange Reserves Section */}
            {exchangeData && (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-3 sm:p-6 rounded-xl shadow-xl border border-zinc-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-base sm:text-xl font-bold text-white">XRP Exchange Reserves</h2>
                            <p className="text-zinc-400 text-xs sm:text-sm">XRP holdings on major exchanges</p>
                        </div>
                        <div className="sm:text-right">
                            <div className="text-lg sm:text-2xl font-bold text-white">{formatXRP(exchangeData.totals.balance)} XRP</div>
                            <div className={`text-xs sm:text-sm ${exchangeData.totals.change_30d < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {exchangeData.totals.change_30d < 0 ? '' : '+'}{formatXRP(exchangeData.totals.change_30d)} (30d)
                            </div>
                        </div>
                    </div>

                    {/* Historical Exchange Reserves Chart - FIRST */}
                    {filteredExchangeHistory.length > 0 && (
                        <div className="mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white">Historical Trend</h3>
                                    <p className="text-zinc-400 text-xs sm:text-sm">
                                        {filteredExchangeHistory.length > 0 ? (
                                            <>
                                                {new Date(filteredExchangeHistory[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {' → '}
                                                {new Date(filteredExchangeHistory[filteredExchangeHistory.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </>
                                        ) : 'Total XRP held on exchanges over time'}
                                    </p>
                                </div>
                                <div className="flex bg-zinc-800/80 rounded-lg p-0.5 sm:p-1 border border-zinc-700/50">
                                    {[
                                        { range: '30d' as const, label: '30D' },
                                        { range: '90d' as const, label: '90D' },
                                        { range: '1y' as const, label: '1Y' },
                                        { range: 'all' as const, label: 'All' },
                                    ].map(({ range, label }) => (
                                        <button
                                            key={range}
                                            onClick={() => setReserveTimeRange(range)}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                                                reserveTimeRange === range
                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[280px] sm:h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={filteredExchangeHistory} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                                        <defs>
                                            <linearGradient id="reserveGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#9CA3AF"
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickFormatter={(v) => {
                                                const d = new Date(v);
                                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }}
                                            ticks={(() => {
                                                // Always include first and last dates, with evenly spaced dates in between
                                                const dates = filteredExchangeHistory.map(h => h.date);
                                                if (dates.length <= 8) return dates;
                                                const numTicks = 6; // Number of intermediate ticks
                                                const result = [dates[0]]; // Start with first date
                                                const step = Math.floor((dates.length - 2) / numTicks);
                                                for (let i = 1; i <= numTicks; i++) {
                                                    const idx = Math.min(i * step, dates.length - 2);
                                                    if (!result.includes(dates[idx])) result.push(dates[idx]);
                                                }
                                                result.push(dates[dates.length - 1]); // Always end with last date (today)
                                                return result;
                                            })()}
                                        />
                                        <YAxis
                                            stroke="#9CA3AF"
                                            tickFormatter={(v) => `${(v / 1e9).toFixed(1)}B`}
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            width={50}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                border: '1px solid rgba(75, 85, 99, 0.5)',
                                                borderRadius: '12px',
                                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                            }}
                                            labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            formatter={(value: number) => [`${formatXRP(value)} XRP`, 'Total Reserves']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#8B5CF6"
                                            strokeWidth={2}
                                            fill="url(#reserveGradient)"
                                            dot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-3 p-2 sm:p-3 bg-zinc-800/50 rounded-lg space-y-1">
                                <p className="text-[10px] sm:text-xs text-zinc-400">
                                    <span className="text-purple-400 font-medium">Decreasing reserves = bullish</span> (XRP moving to self-custody) |
                                    <span className="text-zinc-400 ml-1">Increasing reserves = bearish</span> (XRP moving to exchanges for potential sale)
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-zinc-500 italic">
                                    This is a generally accepted market indicator, not financial advice. Always do your own research.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Exchange Balance Table */}
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                        <table className="min-w-full divide-y divide-zinc-700">
                            <thead>
                                <tr>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-zinc-400 uppercase">Exchange</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-400 uppercase">Balance</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-400 uppercase hidden sm:table-cell">24h</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-400 uppercase">7d</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-400 uppercase">30d</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                                {exchangeData.exchanges.slice(0, 10).map((ex) => (
                                    <tr key={ex.exchange} className="hover:bg-zinc-800/50">
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">
                                                    {/* Fallback always rendered behind */}
                                                    <div className="absolute inset-0 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] sm:text-xs text-zinc-400">
                                                        {ex.exchange.charAt(0)}
                                                    </div>
                                                    {/* Image overlays fallback when loaded successfully */}
                                                    {getExchangeLogo(ex.exchange) && (
                                                        <img
                                                            src={getExchangeLogo(ex.exchange)!}
                                                            alt={ex.exchange}
                                                            className="absolute inset-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <span className="truncate">{ex.exchange}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-white whitespace-nowrap">{formatXRP(ex.balance)}</td>
                                        <td className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right font-medium hidden sm:table-cell ${ex.change_1d_pct === 0 ? 'text-zinc-500' : ex.change_1d_pct < 0 ? 'text-green-400' : 'text-red-400'}`} title={ex.change_1d_pct === 0 ? 'CoinGlass does not provide 24h change data for XRP' : undefined}>
                                            {ex.change_1d_pct === 0 ? 'N/A' : `${ex.change_1d_pct > 0 ? '+' : ''}${ex.change_1d_pct?.toFixed(2)}%`}
                                        </td>
                                        <td className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right font-medium whitespace-nowrap ${ex.change_7d_pct <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {ex.change_7d_pct > 0 ? '+' : ''}{ex.change_7d_pct?.toFixed(2)}%
                                        </td>
                                        <td className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right font-medium whitespace-nowrap ${ex.change_30d_pct <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {ex.change_30d_pct > 0 ? '+' : ''}{ex.change_30d_pct?.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 sm:mt-4 p-2 sm:p-4 bg-zinc-800/50 rounded-lg space-y-1 sm:space-y-2">
                        <p className="text-[10px] sm:text-xs text-zinc-200">
                            <span className="text-green-400 font-medium">Green = XRP leaving</span> (bullish) |
                            <span className="text-red-400 font-medium ml-1">Red = XRP entering</span> (bearish)
                        </p>
                        <p className="text-[10px] sm:text-xs text-zinc-300 hidden sm:block">
                            Note: 24h change shows N/A because CoinGlass does not currently provide intraday data for XRP exchange balances.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
