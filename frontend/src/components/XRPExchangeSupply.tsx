'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ExchangeReserve {
    exchange_name: string;
    balance: number;
    percentage: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Major exchanges for XRP
const MAJOR_EXCHANGES = [
    { name: 'Binance', color: '#F3BA2F' },
    { name: 'Coinbase', color: '#0052FF' },
    { name: 'Kraken', color: '#5741D9' },
    { name: 'Bitstamp', color: '#4A9B48' },
    { name: 'Bitfinex', color: '#16B157' },
    { name: 'OKX', color: '#000000' },
    { name: 'Huobi', color: '#1C64F2' },
    { name: 'KuCoin', color: '#24AE8F' },
];

export default function XRPExchangeSupply() {
    const [reserves, setReserves] = useState<ExchangeReserve[]>([]);
    const [totalSupply, setTotalSupply] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReserves();
        const interval = setInterval(fetchReserves, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchReserves = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/exchange-reserves?crypto=XRP`);
            if (!response.ok) throw new Error('Failed to fetch');
            const json = await response.json();

            // Process and aggregate by exchange
            const exchangeMap = new Map<string, number>();
            let total = 0;

            json.forEach((item: { exchange_name: string; balance: string }) => {
                const balance = parseFloat(item.balance) || 0;
                const exchange = item.exchange_name || 'Other';
                exchangeMap.set(exchange, (exchangeMap.get(exchange) || 0) + balance);
                total += balance;
            });

            const processed: ExchangeReserve[] = Array.from(exchangeMap.entries())
                .map(([name, balance]) => ({
                    exchange_name: name,
                    balance,
                    percentage: total > 0 ? (balance / total) * 100 : 0
                }))
                .sort((a, b) => b.balance - a.balance)
                .slice(0, 8);

            setReserves(processed);
            setTotalSupply(total);
            setError(null);
        } catch (err) {
            // Use placeholder data for demo
            const demoData: ExchangeReserve[] = MAJOR_EXCHANGES.map((ex, i) => ({
                exchange_name: ex.name,
                balance: Math.floor(Math.random() * 2000000000) + 500000000,
                percentage: 0
            }));
            const total = demoData.reduce((sum, d) => sum + d.balance, 0);
            demoData.forEach(d => d.percentage = (d.balance / total) * 100);
            setReserves(demoData.sort((a, b) => b.balance - a.balance));
            setTotalSupply(total);
            setError('Using demo data - connect API for live data');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(0);
    };

    const getExchangeColor = (name: string) => {
        const exchange = MAJOR_EXCHANGES.find(e =>
            name.toLowerCase().includes(e.name.toLowerCase())
        );
        return exchange?.color || '#6366F1';
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-xl shadow-xl border border-zinc-700">
                <div className="animate-pulse">
                    <div className="h-8 bg-zinc-700 rounded w-1/2 mb-6"></div>
                    <div className="h-64 bg-zinc-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-xl shadow-xl border border-zinc-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">XRP</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">XRP Exchange Supply</h2>
                        <p className="text-zinc-400 text-sm">Holdings across major exchanges</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white">{formatNumber(totalSupply)}</div>
                    <div className="text-zinc-400 text-sm">Total on Exchanges</div>
                </div>
            </div>

            {error && (
                <div className="bg-yellow-900/30 border border-yellow-600/50 text-yellow-400 text-sm px-3 py-2 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Chart */}
            <div className="mb-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reserves} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9CA3AF" tickFormatter={formatNumber} />
                        <YAxis type="category" dataKey="exchange_name" stroke="#9CA3AF" width={75} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F9FAFB'
                            }}
                            formatter={(value: number) => [formatNumber(value) + ' XRP', 'Balance']}
                        />
                        <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                            {reserves.map((entry, index) => (
                                <Cell key={index} fill={getExchangeColor(entry.exchange_name)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Exchange Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reserves.slice(0, 8).map((reserve, index) => (
                    <div
                        key={index}
                        className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getExchangeColor(reserve.exchange_name) }}
                            />
                            <span className="text-sm font-medium text-white truncate">
                                {reserve.exchange_name}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-white">
                            {formatNumber(reserve.balance)}
                        </div>
                        <div className="text-xs text-zinc-400">
                            {reserve.percentage.toFixed(1)}% of total
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
