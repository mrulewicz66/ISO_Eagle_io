const puppeteer = require('puppeteer');

class SoSoValueScraper {
    constructor() {
        this.baseURL = 'https://sosovalue.com/assets/etf/us-xrp-spot';
    }

    async scrapeXRPETFFlows() {
        let browser = null;

        try {
            console.log('SoSoValue Scraper: Starting browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath: '/usr/bin/google-chrome',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process'
                ]
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Capture ALL API responses
            const apiResponses = [];
            await page.setRequestInterception(true);
            page.on('request', request => request.continue());

            page.on('response', async response => {
                const url = response.url();
                // Capture any API call to sosovalue
                if (url.includes('sosovalue') && url.includes('api')) {
                    try {
                        const contentType = response.headers()['content-type'] || '';
                        if (contentType.includes('application/json')) {
                            const data = await response.json();
                            console.log('SoSoValue Scraper: Captured API:', url.substring(0, 100));
                            apiResponses.push({ url, data });
                        }
                    } catch (e) {}
                }
            });

            console.log('SoSoValue Scraper: Loading page...');
            await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Extract data from the rendered page
            const scrapedData = await page.evaluate(() => {
                const results = { etfTable: [], dailyFlows: [] };

                // Get __NEXT_DATA__ which contains initial props
                const nextData = document.getElementById('__NEXT_DATA__');
                if (nextData) {
                    try {
                        results.nextData = JSON.parse(nextData.textContent);
                    } catch (e) {}
                }

                // Parse the ETF table rows
                const tableRows = document.querySelectorAll('table tbody tr');
                tableRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        const ticker = cells[0]?.textContent?.trim();
                        const exchange = cells[1]?.textContent?.trim();
                        // Try to find the daily net inflow column
                        const rowText = row.textContent;
                        const inflowMatch = rowText.match(/\$?([\d,.]+)[KMB]?\s*(?:[\d,.]+[KMB]?\s*)?(?=\$[\d,.]+[KMB]?\s*\$[\d,.]+)/);
                        results.etfTable.push({
                            ticker,
                            exchange,
                            fullText: rowText.substring(0, 300)
                        });
                    }
                });

                // Try to find chart data in window
                const scriptTags = document.querySelectorAll('script');
                scriptTags.forEach(script => {
                    const text = script.textContent;
                    if (text.includes('chartData') || text.includes('flowData') || text.includes('inflowData')) {
                        results.scriptData = text.substring(0, 2000);
                    }
                });

                return results;
            });

            await browser.close();
            browser = null;

            return {
                apiResponses,
                scrapedData,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('SoSoValue Scraper error:', error.message);
            if (browser) await browser.close();
            throw error;
        }
    }

    // Extract daily flow totals from scraped data
    extractDailyFlows(rawData) {
        const flows = [];

        // Check for flow data in __NEXT_DATA__
        const nextData = rawData.scrapedData?.nextData;
        if (nextData?.props?.pageProps) {
            const pageProps = nextData.props.pageProps;

            // Extract from historyData.list (the main data source)
            if (pageProps.historyData?.list) {
                for (const entry of pageProps.historyData.list) {
                    // dataDate format: "2025-12-04 00:00:00"
                    const dateStr = entry.dataDate?.split(' ')[0];
                    if (dateStr) {
                        flows.push({
                            date: dateStr,
                            net_flow: parseFloat(entry.totalNetInflow || 0),
                            cumulative_flow: parseFloat(entry.cumNetInflow || 0),
                            total_assets: parseFloat(entry.totalNetAssets || 0),
                            volume: parseFloat(entry.totalVolume || 0),
                            source: 'sosovalue'
                        });
                    }
                }
            }
        }

        // Sort by date ascending
        flows.sort((a, b) => a.date.localeCompare(b.date));

        return flows;
    }

    // Get flows formatted for our API (matching CoinGlass format)
    async getXRPETFFlows() {
        try {
            const rawData = await this.scrapeXRPETFFlows();
            const flows = this.extractDailyFlows(rawData);

            // Transform to match CoinGlass format
            return flows.map(f => ({
                timestamp: new Date(f.date + 'T00:00:00Z').getTime(),
                flow_usd: f.net_flow,
                price_usd: null, // SoSoValue doesn't provide price in this data
                etf_flows: [] // No breakdown available
            }));
        } catch (error) {
            console.error('SoSoValue scraper getXRPETFFlows error:', error.message);
            return null;
        }
    }

    // Extract current day totals from ETF table
    extractCurrentDayTotal(rawData) {
        const etfTable = rawData.scrapedData?.etfTable || [];
        let totalDailyInflow = 0;
        const breakdown = [];

        for (const etf of etfTable) {
            // Parse daily inflow from the full text
            // Format: "XRPC NASDAQ Canary +0.49% $1.34M 638.92K $358.88M..."
            const text = etf.fullText || '';
            const inflowMatch = text.match(/\$?([\d,.]+)([KMB])/);
            if (inflowMatch) {
                let value = parseFloat(inflowMatch[1].replace(/,/g, ''));
                const suffix = inflowMatch[2];
                if (suffix === 'K') value *= 1000;
                if (suffix === 'M') value *= 1000000;
                if (suffix === 'B') value *= 1000000000;

                breakdown.push({
                    ticker: etf.ticker,
                    daily_inflow: value
                });
                totalDailyInflow += value;
            }
        }

        return { totalDailyInflow, breakdown };
    }
}

module.exports = SoSoValueScraper;
