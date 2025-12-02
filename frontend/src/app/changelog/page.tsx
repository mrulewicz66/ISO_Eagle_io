'use client';

import Link from 'next/link';

interface Update {
    date: string;
    version?: string;
    changes: string[];
}

const updates: Update[] = [
    {
        date: '2025-12-01',
        changes: [
            'Added premium waitlist signup with email confirmation',
            'Redesigned waitlist panel with centered layout',
            'Fixed keyboard shortcuts conflicting with Ctrl+C copy',
            'Fixed chart dimension warnings on page load',
        ]
    },
    {
        date: '2025-11-30',
        changes: [
            'Added ETH ETF comparison - compare XRP ETF cumulative flows vs ETH ETF from launch day (purple line)',
            'Added cumulative totals display showing BTC/ETH flows at same number of trading days',
            'Tooltip now shows both daily flow and cumulative for BTC/ETH comparisons',
        ]
    },
    {
        date: '2025-11-29',
        changes: [
            'Added BTC ETF comparison - compare XRP ETF cumulative flows vs BTC ETF from launch day',
            'Added chart zoom with scroll wheel (zoom in/out) and drag to pan',
            'Added dynamic NYSE holiday calendar with automatic year scaling',
            'Added early close day highlighting (Black Friday, Christmas Eve, July 3rd)',
            'Chart tooltips now show holiday names and trading notes',
            'Added historical exchange reserves chart (18+ months of daily data)',
            'Added time range selector for exchange history (30D, 90D, 1Y, All)',
            'Added XRP price correlation overlay on ETF flow chart',
            'Added keyboard shortcuts for power users (1-4, D/W/M/Y/A, C, P)',
            'Added CSV data export for ETF flows',
            'Added bookmarkable URL params for chart state sharing',
        ]
    },
    {
        date: '2025-11-28',
        changes: [
            'Added copy-to-clipboard share button for mobile users',
            'Added changelog page to track site updates',
        ]
    },
    {
        date: '2025-11-27',
        changes: [
            'Redesigned social preview images for better readability',
            'Added Twitter/X share button with pre-formatted tweets',
            'Added cumulative ETF flow line with toggle',
            'Added 7-day trading volume to Market Cap section',
        ]
    },
    {
        date: '2025-11-26',
        changes: [
            'Fixed timezone bug: ETF dates now display in UTC',
            'Added smart X-axis label spacing for better readability at different scales',
        ]
    },
    {
        date: '2025-11-25',
        changes: [
            'Show N/A for 24h exchange reserve change (CoinGlass API limitation)',
            'Updated support section to explain API costs',
        ]
    },
    {
        date: '2025-11-24',
        changes: [
            'Initial launch of ISO Eagle XRP ETF Monitor',
            'Real-time ETF flow tracking from CoinGlass + SoSoValue',
            'Exchange reserves monitoring',
            'ISO 20022 token table',
            'Multiple chart types (composed, bar, area, line)',
            'Time range filtering (7d, 30d, 90d, 1y, all)',
            'Mobile-responsive dark theme design',
        ]
    },
];

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header with Logo - matches main dashboard */}
            <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-3 sm:p-4">
                <div className="container mx-auto flex items-center gap-2 sm:gap-3">
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                        <div
                            className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: '#2F2F2F' }}
                        >
                            <img
                                src="/iso-eagle.png"
                                alt="ISO Eagle"
                                style={{
                                    transform: 'scale(1.15) translateY(6%)',
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-white truncate">ISO Eagle</h1>
                            <p className="text-xs text-zinc-400 truncate">XRP & ISO 20022 Institutional Tracking</p>
                        </div>
                    </Link>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </Link>

                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Changelog</h1>
                    <p className="text-zinc-400">Track all updates and improvements to ISO Eagle</p>
                </div>

                {/* Updates List */}
                <div className="space-y-8">
                    {updates.map((update, index) => (
                        <div key={update.date} className="relative">
                            {/* Timeline connector */}
                            {index < updates.length - 1 && (
                                <div className="absolute left-[7px] top-8 bottom-0 w-0.5 bg-zinc-800" />
                            )}

                            <div className="flex gap-4">
                                {/* Timeline dot */}
                                <div className="relative">
                                    <div className={`w-4 h-4 rounded-full mt-1.5 ${
                                        index === 0
                                            ? 'bg-green-500 ring-4 ring-green-500/20'
                                            : 'bg-zinc-700'
                                    }`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-8">
                                    <div className="flex items-center gap-3 mb-3">
                                        <time className="text-lg font-semibold text-white">
                                            {new Date(update.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </time>
                                        {index === 0 && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                    <ul className="space-y-2">
                                        {update.changes.map((change, changeIndex) => (
                                            <li
                                                key={changeIndex}
                                                className="flex items-start gap-2 text-zinc-300"
                                            >
                                                <span className="text-zinc-600 mt-1.5">•</span>
                                                <span>{change}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
                    <p>Have a feature request?</p>
                    <a
                        href="https://x.com/rulewicz66"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Let us know on X
                    </a>
                </div>
            </div>
        </div>
    );
}
