import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ISO Eagle - XRP ETF Monitor';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #4338ca 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {/* Main content container */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                    }}
                >
                    {/* Title */}
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 800,
                            color: 'white',
                            marginBottom: 20,
                            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        }}
                    >
                        ISO Eagle
                    </div>

                    {/* Subtitle */}
                    <div
                        style={{
                            fontSize: 36,
                            fontWeight: 600,
                            color: '#93c5fd',
                            marginBottom: 40,
                        }}
                    >
                        XRP ETF Monitor & Exchange Reserves
                    </div>

                    {/* Feature badges */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 20,
                        }}
                    >
                        <div
                            style={{
                                background: 'rgba(34, 197, 94, 0.3)',
                                border: '2px solid rgba(34, 197, 94, 0.6)',
                                borderRadius: 12,
                                padding: '12px 24px',
                                color: '#4ade80',
                                fontSize: 24,
                                fontWeight: 600,
                            }}
                        >
                            ETF Flows
                        </div>
                        <div
                            style={{
                                background: 'rgba(59, 130, 246, 0.3)',
                                border: '2px solid rgba(59, 130, 246, 0.6)',
                                borderRadius: 12,
                                padding: '12px 24px',
                                color: '#60a5fa',
                                fontSize: 24,
                                fontWeight: 600,
                            }}
                        >
                            Exchange Reserves
                        </div>
                        <div
                            style={{
                                background: 'rgba(168, 85, 247, 0.3)',
                                border: '2px solid rgba(168, 85, 247, 0.6)',
                                borderRadius: 12,
                                padding: '12px 24px',
                                color: '#c084fc',
                                fontSize: 24,
                                fontWeight: 600,
                            }}
                        >
                            ISO 20022
                        </div>
                    </div>
                </div>

                {/* URL at bottom */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        fontSize: 28,
                        color: 'rgba(255,255,255,0.7)',
                    }}
                >
                    isoeagle.io
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
