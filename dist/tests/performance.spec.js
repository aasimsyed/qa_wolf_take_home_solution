"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const HackerNewsPage_1 = require("../src/pages/HackerNewsPage");
test_1.test.describe('Performance Tests', () => {
    (0, test_1.test)('should load first page within performance budget', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        // Start performance measurement
        const startTime = Date.now();
        await hackerNewsPage.goto();
        const loadTime = Date.now() - startTime;
        // Performance budgets
        const LOAD_TIME_BUDGET = 2000; // 2 seconds
        (0, test_1.expect)(loadTime).toBeLessThan(LOAD_TIME_BUDGET);
        // Measure Core Web Vitals
        const webVitals = await page.evaluate(() => ({
            cls: performance.getEntriesByType('layout-shift')
                .reduce((sum, entry) => sum + entry.value, 0),
            lcp: performance.getEntriesByType('largest-contentful-paint')
                .pop()?.startTime || 0,
            fid: performance.getEntriesByType('first-input')
                .pop()?.processingStart || 0
        }));
        // Core Web Vitals thresholds
        (0, test_1.expect)(webVitals.cls).toBeLessThan(0.1); // Good CLS is < 0.1
        (0, test_1.expect)(webVitals.lcp).toBeLessThan(2500); // Good LCP is < 2.5s
        (0, test_1.expect)(webVitals.fid).toBeLessThan(100); // Good FID is < 100ms
    });
    (0, test_1.test)('should maintain performance during pagination', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        const navigationTimes = [];
        const memoryUsage = [];
        // Measure performance across multiple page loads
        for (let i = 0; i < 3; i++) {
            const startTime = Date.now();
            await hackerNewsPage.loadNextPage();
            navigationTimes.push(Date.now() - startTime);
            // Measure memory usage if available
            const memory = await page.evaluate(() => window.performance.memory?.usedJSHeapSize || 0);
            memoryUsage.push(memory);
        }
        // Verify consistent navigation times
        const avgNavigationTime = navigationTimes.reduce((a, b) => a + b) / navigationTimes.length;
        const maxDeviation = Math.max(...navigationTimes.map(t => Math.abs(t - avgNavigationTime)));
        (0, test_1.expect)(maxDeviation).toBeLessThan(1000); // Max 1s deviation
    });
    (0, test_1.test)('should maintain stable memory usage during pagination', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        // Baseline memory measurement
        const baselineMemory = await page.evaluate(() => window.performance.memory?.usedJSHeapSize || 0);
        // Load next page and measure memory
        await hackerNewsPage.loadNextPage();
        const afterPageLoadMemory = await page.evaluate(() => window.performance.memory?.usedJSHeapSize || 0);
        // Assert memory increase is within threshold
        (0, test_1.expect)(afterPageLoadMemory - baselineMemory).toBeLessThan(5 * 1024 * 1024); // 5MB threshold
    });
    (0, test_1.test)('should handle rate limiting gracefully', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        const startTime = Date.now();
        // Rapid requests to trigger rate limiting
        for (let i = 0; i < 5; i++) {
            await hackerNewsPage.loadNextPage();
        }
        const totalTime = Date.now() - startTime;
        const expectedMinTime = 500 * 5; // At least 500ms between requests
        // Verify rate limiting is working
        (0, test_1.expect)(totalTime).toBeGreaterThanOrEqual(expectedMinTime);
    });
    (0, test_1.test)('should optimize DOM operations', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        // Measure DOM query performance
        const startTime = Date.now();
        const timestamps = await hackerNewsPage.getPageTimestamps();
        const queryTime = Date.now() - startTime;
        // Performance budget for DOM operations
        (0, test_1.expect)(queryTime).toBeLessThan(500); // 500ms budget
        (0, test_1.expect)(timestamps.length).toBeGreaterThan(0);
    });
});
