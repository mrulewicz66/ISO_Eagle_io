const fs = require('fs');
let content = fs.readFileSync('XRPDashboard.tsx', 'utf8');

// 1. Add new ETF tickers to KNOWN_ETF_INFO
content = content.replace(
    `// Known ETFs with their colors and institutions
const KNOWN_ETF_INFO: { [key: string]: { color: string; institution: string } } = {
    'XRPC': { color: '#10B981', institution: 'Canary Capital' },
    'XRPZ': { color: '#3B82F6', institution: 'Franklin Templeton' },
    'XRP': { color: '#F59E0B', institution: 'Bitwise' },
    'GXRP': { color: '#8B5CF6', institution: 'Grayscale' },
};`,
    `// Known ETFs with their colors and institutions
const KNOWN_ETF_INFO: { [key: string]: { color: string; institution: string } } = {
    'XRPC': { color: '#10B981', institution: 'Canary Capital' },
    'XRPZ': { color: '#3B82F6', institution: 'Franklin Templeton' },
    'XRP': { color: '#F59E0B', institution: 'Bitwise' },
    'GXRP': { color: '#8B5CF6', institution: 'Grayscale' },
    // Additional ETFs
    'XXRP': { color: '#EC4899', institution: 'REX Shares/Osprey' },
    'AXRP': { color: '#06B6D4', institution: 'Amplify' },
    'CXRP': { color: '#EF4444', institution: '21Shares' },
};`
);

// 2. Change latestETFBreakdown to show ALL known ETFs, not just ones with data
content = content.replace(
    `const latestETFBreakdown = latestTradingDayData?.etf_breakdown?.filter(e => e.flow_usd > 0) || [];`,
    `// Show ALL known ETFs, with actual data merged in (even if $0)
    const latestETFBreakdown = useMemo(() => {
        const dataMap = new Map(latestTradingDayData?.etf_breakdown?.map(e => [e.ticker, e.flow_usd]) || []);
        return Object.keys(KNOWN_ETF_INFO).map(ticker => ({
            ticker,
            flow_usd: dataMap.get(ticker) || 0
        }));
    }, [latestTradingDayData]);`
);

fs.writeFileSync('XRPDashboard.tsx', content);
console.log('Updated ETF display to show all known ETFs');
