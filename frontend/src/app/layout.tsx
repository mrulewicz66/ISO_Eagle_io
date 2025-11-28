import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "ISO Eagle - XRP ETF Monitor & Exchange Reserves",
    description: "Real-time XRP ETF flow tracking, exchange reserves monitoring, and ISO 20022 compliant token prices. Track institutional crypto adoption.",
    metadataBase: new URL('https://isoeagle.io'),
    openGraph: {
        title: "ISO Eagle - XRP ETF Monitor",
        description: "Real-time XRP ETF flows, exchange reserves, and ISO 20022 token tracking. Monitor institutional crypto adoption.",
        url: 'https://isoeagle.io',
        siteName: 'ISO Eagle',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: "ISO Eagle - XRP ETF Monitor",
        description: "Real-time XRP ETF flows, exchange reserves, and ISO 20022 token tracking.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                {children}
            </body>
        </html>
    );
}
