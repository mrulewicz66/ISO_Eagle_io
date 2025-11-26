'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ETFFlow {
    date: string;
    net_flow: number;
}

interface PriceData {
    price_usd: number;
    market_cap: number;
    volume_24h: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function XRPDashboard() {
    const [etfFlows, setEtfFlows] = useState<ETFFlow[]>([]);
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [totalInflow, setTotalInflow] = useState(0);
    const [totalOutflow, setTotalOutflow] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [flowsRes, pricesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/etf-flows?asset=XRP&days=30`),
                fetch(`${API_BASE_URL}/api/prices`)
            ]);

            if (flowsRes.ok) {
                const flows = await flowsRes.json();
                const processed = flows.map((f: { date: string; net_flow: string }) => ({
                    date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    net_flow: parseFloat(f.net_flow) || 0
                })).reverse();
                setEtfFlows(processed);

                const inflow = processed.filter((f: ETFFlow) => f.net_flow > 0).reduce((sum: number, f: ETFFlow) => sum + f.net_flow, 0);
                const outflow = Math.abs(processed.filter((f: ETFFlow) => f.net_flow < 0).reduce((sum: number, f: ETFFlow) => sum + f.net_flow, 0));
                setTotalInflow(inflow);
                setTotalOutflow(outflow);
            } else {
                // Demo data
                const demoFlows = Array.from({ length: 30 }, (_, i) => ({
                    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    net_flow: (Math.random() - 0.4) * 50000000
                }));
                setEtfFlows(demoFlows);
                setTotalInflow(demoFlows.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0));
                setTotalOutflow(Math.abs(demoFlows.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0)));
            }

            if (pricesRes.ok) {
                const prices = await pricesRes.json();
                const xrp = prices.find((p: { crypto_symbol: string }) => p.crypto_symbol === 'XRP');
                if (xrp) {
                    setPriceData({
                        price_usd: parseFloat(xrp.price_usd),
                        market_cap: parseFloat(xrp.market_cap),
                        volume_24h: parseFloat(xrp.volume_24h)
                    });
                }
            }

            if (!priceData) {
                // Demo price data
                setPriceData({
                    price_usd: 2.34,
                    market_cap: 134000000000,
                    volume_24h: 8500000000
                });
            }
        } catch (err) {
            console.error('Error fetching XRP data:', err);
            // Set demo data on error
            const demoFlows = Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                net_flow: (Math.random() - 0.4) * 50000000
            }));
            setEtfFlows(demoFlows);
            setTotalInflow(demoFlows.filter(f => f.net_flow > 0).reduce((sum, f) => sum + f.net_flow, 0));
            setTotalOutflow(Math.abs(demoFlows.filter(f => f.net_flow < 0).reduce((sum, f) => sum + f.net_flow, 0)));
            setPriceData({
                price_usd: 2.34,
                market_cap: 134000000000,
                volume_24h: 8500000000
            });
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    const formatFlow = (num: number) => {
        const abs = Math.abs(num);
        if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(0);
    };

    const netFlow = totalInflow - totalOutflow;

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
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">XRP</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">XRP ETF Monitor</h1>
                        <p className="text-blue-100">Real-time institutional flow tracking</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="text-blue-100 text-sm mb-1">Current Price</div>
                        <div className="text-2xl font-bold text-white">
                            ${priceData?.price_usd.toFixed(4) || '-'}
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="text-blue-100 text-sm mb-1">Market Cap</div>
                        <div className="text-2xl font-bold text-white">
                            {priceData ? formatNumber(priceData.market_cap) : '-'}
                        </div>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur rounded-xl p-4 border border-green-400/30">
                        <div className="text-green-200 text-sm mb-1">30D Inflows</div>
                        <div className="text-2xl font-bold text-green-400">
                            +{formatFlow(totalInflow)}
                        </div>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur rounded-xl p-4 border border-red-400/30">
                        <div className="text-red-200 text-sm mb-1">30D Outflows</div>
                        <div className="text-2xl font-bold text-red-400">
                            -{formatFlow(totalOutflow)}
                        </div>
                    </div>
                </div>
            </div>

            {/* ETF Flow Chart */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-xl shadow-xl border border-zinc-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">XRP ETF Daily Flows</h2>
                        <p className="text-zinc-400 text-sm">Net inflows and outflows over 30 days</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full ${netFlow >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        <span className="font-bold">Net: {netFlow >= 0 ? '+' : ''}{formatFlow(netFlow)}</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={etfFlows}>
                        <defs>
                            <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="outflowGradient" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9CA3AF" tickFormatter={formatFlow} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F9FAFB'
                            }}
                            formatter={(value: number) => [
                                `${value >= 0 ? '+' : ''}${formatFlow(value)} XRP`,
                                value >= 0 ? 'Inflow' : 'Outflow'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="net_flow"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            fill="url(#inflowGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Flow Summary */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-700">
                    <div className="text-center">
                        <div className="text-zinc-400 text-sm">Total Volume</div>
                        <div className="text-xl font-bold text-white">{formatFlow(totalInflow + totalOutflow)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-zinc-400 text-sm">Avg Daily Flow</div>
                        <div className="text-xl font-bold text-white">{formatFlow(netFlow / 30)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-zinc-400 text-sm">Flow Ratio</div>
                        <div className={`text-xl font-bold ${totalInflow > totalOutflow ? 'text-green-400' : 'text-red-400'}`}>
                            {totalOutflow > 0 ? (totalInflow / totalOutflow).toFixed(2) : '∞'}x
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
