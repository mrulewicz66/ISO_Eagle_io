const fs = require('fs');
let content = fs.readFileSync('XRPDashboard.tsx', 'utf8');

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
    // New ETFs launching Dec 2024
    'XXRP': { color: '#EC4899', institution: 'REX Shares/Osprey' },
    'AXRP': { color: '#06B6D4', institution: 'Amplify' },
    'CXRP': { color: '#EF4444', institution: '21Shares' },
};`
);

fs.writeFileSync('XRPDashboard.tsx', content);
console.log('Added new ETF tickers');
