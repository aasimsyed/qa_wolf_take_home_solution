"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const HackerNewsPage_1 = require("../src/pages/HackerNewsPage");
// Track request timestamps to prevent rate limiting
const requestTimestamps = [];
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
test_1.test.beforeAll(() => {
    // Set up global rate limiting protection
    global.requestGuard = {
        // Check if we can make a request
        canMakeRequest: () => {
            const now = Date.now();
            // Remove old timestamps
            while (requestTimestamps.length > 0 && now - requestTimestamps[0] > MIN_REQUEST_INTERVAL) {
                requestTimestamps.shift();
            }
            // Check if we're within rate limit
            return requestTimestamps.length < 3; // Max 3 requests per interval
        },
        // Record a request
        recordRequest: () => {
            requestTimestamps.push(Date.now());
        },
        // Wait until we can make a request
        waitForRequest: async function () {
            while (!this.canMakeRequest()) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            this.recordRequest();
        }
    };
});
test_1.test.describe('Hacker News Article Sorting Tests', () => {
    // Extended timeout to accommodate rate limiting and pagination
    test_1.test.setTimeout(60000);
    (0, test_1.test)('first page articles should be sorted from newest to oldest', async ({ page }) => {
        // Fast smoke test checking only first page (30 articles)
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        // Get timestamps from first page only
        const timestamps = await hackerNewsPage.getPageTimestamps();
        (0, test_1.expect)(timestamps.length).toBeGreaterThan(0);
        // Verify strict chronological ordering
        for (let i = 1; i < timestamps.length; i++) {
            (0, test_1.expect)(timestamps[i].getTime(), `Article at position ${i + 1} is newer than article at position ${i}`).toBeLessThanOrEqual(timestamps[i - 1].getTime());
        }
        // Verify reasonable time range (articles shouldn't be too old on first page)
        const now = new Date().getTime();
        const oldestAllowed = now - (24 * 60 * 60 * 1000); // 24 hours
        for (const timestamp of timestamps) {
            (0, test_1.expect)(timestamp.getTime(), 'Article is older than 24 hours on first page').toBeGreaterThan(oldestAllowed);
        }
    });
    (0, test_1.test)('first 100 articles should be sorted from newest to oldest', async ({ page }) => {
        // Full validation test checking chronological order across pages
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        // Get timestamps for all 100 articles (requires pagination)
        const timestamps = await hackerNewsPage.getArticleTimestamps();
        (0, test_1.expect)(timestamps).toHaveLength(100);
        // Verify strict chronological ordering across all pages
        for (let i = 1; i < timestamps.length; i++) {
            (0, test_1.expect)(timestamps[i].getTime(), `Article at position ${i + 1} is newer than article at position ${i}`).toBeLessThanOrEqual(timestamps[i - 1].getTime());
        }
    });
    (0, test_1.test)('should handle page refresh and maintain order', async ({ page }) => {
        // Validates sorting persistence after page refresh
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        // Get initial timestamps before refresh
        const timestamps = await hackerNewsPage.getArticleTimestamps();
        (0, test_1.expect)(timestamps).toHaveLength(100);
        // Refresh and wait with extended timeout for rate limiting
        await page.reload();
        await hackerNewsPage.waitForArticles(45000);
        // Verify chronological order is maintained after refresh
        const newTimestamps = await hackerNewsPage.getArticleTimestamps();
        (0, test_1.expect)(newTimestamps).toHaveLength(100);
        (0, test_1.expect)(newTimestamps[0].getTime()).toBeGreaterThan(newTimestamps[99].getTime());
    });
});
