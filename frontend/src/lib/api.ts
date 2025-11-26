const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchETFFlows(asset?: string, days: number = 30) {
    const params = new URLSearchParams();
    if (asset) params.append('asset', asset);
    params.append('days', days.toString());

    const response = await fetch(`${API_BASE_URL}/api/etf-flows?${params}`);
    if (!response.ok) throw new Error('Failed to fetch ETF flows');
    return response.json();
}

export async function fetchExchangeReserves(crypto?: string, hours: number = 24) {
    const params = new URLSearchParams();
    if (crypto) params.append('crypto', crypto);
    params.append('hours', hours.toString());

    const response = await fetch(`${API_BASE_URL}/api/exchange-reserves?${params}`);
    if (!response.ok) throw new Error('Failed to fetch exchange reserves');
    return response.json();
}

export async function fetchPrices() {
    const response = await fetch(`${API_BASE_URL}/api/prices`);
    if (!response.ok) throw new Error('Failed to fetch prices');
    return response.json();
}

export async function fetchDashboardSummary() {
    const response = await fetch(`${API_BASE_URL}/api/dashboard-summary`);
    if (!response.ok) throw new Error('Failed to fetch dashboard summary');
    return response.json();
}
