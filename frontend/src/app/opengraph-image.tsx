import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// v2 - Dec 2024
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
                    background: '#0a0a0a',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {/* Gradient overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.2) 50%, rgba(67, 56, 202, 0.15) 100%)',
                    }}
                />

                {/* Decorative grid pattern */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }}
                />

                {/* Main content - left aligned layout */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '60px 80px',
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Top section with logos */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 24,
                            marginBottom: 32,
                        }}
                    >
                        {/* ISO Eagle Logo */}
                        <div
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                backgroundColor: '#2F2F2F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '3px solid rgba(255,255,255,0.2)',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://isoeagle.io/iso-eagle.png"
                                alt="ISO Eagle"
                                width={80}
                                height={80}
                                style={{
                                    transform: 'scale(1.15) translateY(6%)',
                                }}
                            />
                        </div>

                        {/* XRP Logo */}
                        <div
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                backgroundColor: '#1a1a1a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '3px solid rgba(255,255,255,0.2)',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://isoeagle.io/xrplogo.png"
                                alt="XRP"
                                width={80}
                                height={80}
                                style={{
                                    objectFit: 'cover',
                                }}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 800,
                            color: 'white',
                            marginBottom: 16,
                            letterSpacing: '-2px',
                            lineHeight: 1,
                        }}
                    >
                        ISO Eagle
                    </div>

                    {/* Subtitle */}
                    <div
                        style={{
                            fontSize: 40,
                            fontWeight: 700,
                            color: 'white',
                            marginBottom: 40,
                            opacity: 0.95,
                        }}
                    >
                        XRP ETF Flow Tracker
                    </div>

                    {/* Feature list */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 32,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: '#22c55e',
                                }}
                            />
                            <span style={{ color: 'white', fontSize: 28, fontWeight: 600 }}>
                                Real-time ETF Flows
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                }}
                            />
                            <span style={{ color: 'white', fontSize: 28, fontWeight: 600 }}>
                                Exchange Reserves
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: '#a855f7',
                                }}
                            />
                            <span style={{ color: 'white', fontSize: 28, fontWeight: 600 }}>
                                ISO 20022 Tokens
                            </span>
                        </div>
                    </div>
                </div>

                {/* URL badge at bottom right */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        right: 60,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255,255,255,0.1)',
                        padding: '12px 24px',
                        borderRadius: 100,
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}
                >
                    <span style={{ fontSize: 24, color: 'white', fontWeight: 600 }}>
                        isoeagle.io
                    </span>
                </div>

                {/* Decorative accent line */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 6,
                        background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 50%, #a855f7 100%)',
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    );
}
