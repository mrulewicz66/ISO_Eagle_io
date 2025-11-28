'use client';

import { useEffect, useState } from 'react';

interface CryptoPrice {
    crypto_symbol: string;
    price_usd: string;
    market_cap: string;
    volume_24h: string;
    price_change_24h: string;
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

// Token logos from CoinGecko
const TOKEN_LOGOS: { [key: string]: string } = {
    'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    'XLM': 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    'XDC': 'https://assets.coingecko.com/coins/images/2912/small/xdc-icon.png',
    'ALGO': 'https://assets.coingecko.com/coins/images/4380/small/download.png',
    'IOTA': 'https://assets.coingecko.com/coins/images/692/small/IOTA_Swirl.png',
    'HBAR': 'https://assets.coingecko.com/coins/images/3688/small/hbar.png',
    'QNT': 'https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg',
    'ADA': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
};

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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_BASE_URL}/api/prices`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Failed to fetch');
            const json = await response.json();
            setPrices(json);
            setError(null);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Backend unavailable - start the backend server');
            } else {
                setError('Backend unavailable - start the backend server');
            }
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
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-6 rounded-lg shadow border-2 border-purple-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                <div>
                    <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">
                        ISO 20022 Compliant Tokens
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mt-1">
                        Cryptocurrencies aligned with SWIFT standards
                    </p>
                </div>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full self-start sm:self-auto">
                    SWIFT Compatible
                </span>
            </div>

            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-purple-50 dark:bg-purple-900/20">
                        <tr>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Token
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                                Use Case
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                24h
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                                MCap
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                                Volume
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                        {ISO_20022_TOKENS.map((token) => {
                            const priceData = getPriceData(token.symbol);
                            return (
                                <tr key={token.symbol} className="hover:bg-purple-50 dark:hover:bg-purple-900/10">
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="relative w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 flex-shrink-0">
                                                {/* Fallback always rendered behind */}
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold">
                                                    {token.symbol.slice(0, 2)}
                                                </div>
                                                {/* Logo image overlays fallback */}
                                                {TOKEN_LOGOS[token.symbol] && (
                                                    <img
                                                        src={TOKEN_LOGOS[token.symbol]}
                                                        alt={token.symbol}
                                                        className="absolute inset-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover bg-zinc-800"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">
                                                    {token.symbol}
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                    {token.name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                                        {token.description}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-medium text-zinc-900 dark:text-white">
                                        {priceData ? formatCurrency(priceData.price_usd) : '-'}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-semibold">
                                        {priceData && priceData.price_change_24h ? (
                                            <span className={parseFloat(priceData.price_change_24h) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(priceData.price_change_24h) >= 0 ? '+' : ''}{parseFloat(priceData.price_change_24h).toFixed(2)}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                                        {priceData ? formatCurrency(priceData.market_cap) : '-'}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
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
