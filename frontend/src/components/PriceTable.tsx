'use client';

import { useEffect, useState } from 'react';
import { fetchPrices } from '@/lib/api';

interface Price {
    crypto_symbol: string;
    price_usd: string;
    market_cap: string;
    volume_24h: string;
    timestamp: string;
}

export default function PriceTable() {
    const [prices, setPrices] = useState<Price[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPriceData();
        const interval = setInterval(fetchPriceData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchPriceData = async () => {
        try {
            const json = await fetchPrices();
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
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                <div className="animate-pulse">
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow overflow-x-auto">
            <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">Current Prices</h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {prices.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                    No price data available. Connect API keys to fetch data.
                </div>
            ) : (
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Symbol
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Market Cap
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                24h Volume
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                        {prices.map((price, index) => (
                            <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-white">
                                    {price.crypto_symbol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                                    {formatCurrency(price.price_usd)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                                    {formatCurrency(price.market_cap)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                                    {formatCurrency(price.volume_24h)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
