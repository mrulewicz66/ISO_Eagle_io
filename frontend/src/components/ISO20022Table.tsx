'use client';

import { useEffect, useState } from 'react';

interface CryptoPrice {
    crypto_symbol: string;
    price_usd: string;
    market_cap: string;
    volume_24h: string;
    timestamp: string;
}

const ISO_20022_TOKENS = [
    { symbol: 'XRP', name: 'Ripple', description: 'Cross-border payments' },
    { symbol: 'XLM', name: 'Stellar Lumens', description: 'Financial inclusion' },
    { symbol: 'XDC', name: 'XDC Network', description: 'Trade finance' },
    { symbol: 'ALGO', name: 'Algorand', description: 'Pure proof-of-stake' },
    { symbol: 'IOTA', name: 'IOTA', description: 'IoT & data integrity' },
    { symbol: 'HBAR', name: 'Hedera Hashgraph', description: 'Enterprise DLT' },
    { symbol: 'QNT', name: 'Quant', description: 'Blockchain interoperability' },
    { symbol: 'ADA', name: 'Cardano', description: 'Proof-of-stake platform' },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ISO20022Table() {
    const [prices, setPrices] = useState<CryptoPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPriceData();
        const interval = setInterval(fetchPriceData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchPriceData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/prices`);
            if (!response.ok) throw new Error('Failed to fetch');
            const json = await response.json();
            setPrices(json);
            setError(null);
        } catch (err) {
            setError('Failed to load prices');
            console.error('Error fetching prices:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '-';
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        if (num < 0.01) return `$${num.toFixed(6)}`;
        return `$${num.toFixed(2)}`;
    };

    const getPriceData = (symbol: string) => {
        return prices.find(p => p.crypto_symbol === symbol);
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow border-2 border-purple-500">
                <div className="animate-pulse">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow border-2 border-purple-500">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                        ISO 20022 Compliant Tokens
                    </h2>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                        Cryptocurrencies aligned with global financial messaging standards
                    </p>
                </div>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold px-3 py-1 rounded-full">
                    SWIFT Compatible
                </span>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-purple-50 dark:bg-purple-900/20">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Token
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Use Case
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Market Cap
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                24h Volume
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                        {ISO_20022_TOKENS.map((token) => {
                            const priceData = getPriceData(token.symbol);
                            return (
                                <tr key={token.symbol} className="hover:bg-purple-50 dark:hover:bg-purple-900/10">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-3">
                                                {token.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {token.symbol}
                                                </div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {token.name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                                        {token.description}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-zinc-900 dark:text-white">
                                        {priceData ? formatCurrency(priceData.price_usd) : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-zinc-500 dark:text-zinc-400">
                                        {priceData ? formatCurrency(priceData.market_cap) : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-zinc-500 dark:text-zinc-400">
                                        {priceData ? formatCurrency(priceData.volume_24h) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
