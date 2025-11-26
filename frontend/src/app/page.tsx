import XRPDashboard from '@/components/XRPDashboard';
import XRPExchangeSupply from '@/components/XRPExchangeSupply';
import PriceTable from '@/components/PriceTable';
import ISO20022Table from '@/components/ISO20022Table';
import ConnectionStatus from '@/components/ConnectionStatus';

export const dynamic = 'force-dynamic';

export default function Home() {
    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold">CM</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Crypto Monitor</h1>
                            <p className="text-xs text-zinc-400">XRP & ISO 20022 Focus</p>
                        </div>
                    </div>
                    <ConnectionStatus />
                </div>
            </header>

            <main className="container mx-auto p-6 space-y-8">

                {/* ========== PRIMARY SECTION: XRP ========== */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            PRIMARY FOCUS
                        </span>
                        <span className="text-zinc-400 text-sm">XRP Institutional Tracking</span>
                    </div>

                    {/* XRP ETF Dashboard with Stats */}
                    <XRPDashboard />
                </section>

                {/* XRP Exchange Supply */}
                <section>
                    <XRPExchangeSupply />
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

                {/* Top 10 Cryptos */}
                <section className="pt-8 border-t border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                        Top 10 Cryptocurrencies
                    </h2>
                    <PriceTable />
                </section>

            </main>

            {/* Footer */}
            <footer className="bg-zinc-900 border-t border-zinc-800 p-6 mt-12">
                <div className="container mx-auto text-center">
                    <p className="text-sm text-zinc-500">
                        Data provided by CoinGecko, CoinGlass, and CryptoQuant.
                        Not financial advice. ISO 20022 compliance status may vary.
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                        XRP ETF data is for informational purposes only.
                    </p>
                </div>
            </footer>
        </div>
    );
}
