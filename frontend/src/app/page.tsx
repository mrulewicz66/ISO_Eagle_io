import XRPDashboard from '@/components/XRPDashboard';
import ISO20022Table from '@/components/ISO20022Table';
import ConnectionStatus from '@/components/ConnectionStatus';

export const dynamic = 'force-dynamic';

export default function Home() {
    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-3 sm:p-4">
                <div className="container mx-auto flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div
                            className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: '#2F2F2F' }}
                            title="ISO Eagle"
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
                            <p className="text-xs text-zinc-400 truncate">XRP & ISO 20022 Focus</p>
                        </div>
                    </div>
                    <ConnectionStatus />
                </div>
            </header>

            <main className="container mx-auto px-3 py-4 sm:p-6 space-y-6 sm:space-y-8">

                {/* ========== PRIMARY SECTION: XRP ========== */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            PRIMARY FOCUS
                        </span>
                        <span className="text-zinc-400 text-sm">XRP Institutional Tracking</span>
                    </div>

                    {/* XRP ETF Dashboard with Stats + Exchange Reserves */}
                    <XRPDashboard />
                </section>

                {/* ========== SECONDARY SECTION: ISO 20022 ========== */}
                <section className="pt-8 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            ISO 20022
                        </span>
                        <span className="text-zinc-400 text-sm">SWIFT-Compatible Tokens</span>
                    </div>
                    <ISO20022Table />
                </section>

                {/* ========== SUPPORT SECTION ========== */}
                <section className="pt-6 sm:pt-8 border-t border-zinc-800">
                    <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 p-4 sm:p-6 rounded-xl border border-amber-500/30">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                            <div className="text-3xl sm:text-4xl">☕</div>
                            <div className="flex-1">
                                <h3 className="text-base sm:text-lg font-bold text-amber-200">Support This Dashboard</h3>
                                <p className="text-amber-100/70 text-xs sm:text-sm mt-1">
                                    This dashboard relies on premium API subscriptions. These services cost $50-200+/month to maintain.
                                </p>
                                <p className="text-amber-100/50 text-[10px] sm:text-xs mt-1 sm:mt-2 hidden sm:block">
                                    Your support helps cover API costs and enables new features like historical charts, alerts, and additional token tracking.
                                </p>
                            </div>
                            <a
                                href="https://buymeacoffee.com/isoeagle.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base self-start md:self-auto"
                            >
                                Buy Me a Coffee
                            </a>
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="bg-zinc-900 border-t border-zinc-800 px-3 py-4 sm:p-6 mt-8 sm:mt-12">
                <div className="container mx-auto text-center">
                    <p className="text-xs sm:text-sm text-white">
                        Data: CoinGecko, CoinGlass, CryptoQuant. Not financial advice.
                    </p>
                    <p className="text-[10px] sm:text-xs text-zinc-300 mt-1 sm:mt-2">
                        XRP ETF data is for informational purposes only.
                    </p>
                </div>
            </footer>
        </div>
    );
}
