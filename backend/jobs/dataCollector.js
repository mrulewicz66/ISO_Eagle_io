const cron = require('node-cron');
const DataAggregator = require('../services/dataAggregator');

const aggregator = new DataAggregator();

function startDataCollectionJobs() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('Running data collection job...');
        try {
            await aggregator.aggregateAllData();
            console.log('Data collection completed successfully');
        } catch (error) {
            console.error('Data collection failed:', error);
        }
    });

    // ETF data - run once daily at market close (4:00 PM EST = 21:00 UTC)
    cron.schedule('0 21 * * 1-5', async () => {
        console.log('Running daily ETF collection...');
        try {
            await aggregator.aggregateAllData();
            console.log('Daily ETF collection completed');
        } catch (error) {
            console.error('Daily ETF collection failed:', error);
        }
    });

    console.log('Data collection jobs scheduled');
}

module.exports = { startDataCollectionJobs };
