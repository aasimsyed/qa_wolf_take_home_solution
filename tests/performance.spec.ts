import { test, expect } from '@playwright/test';
import { HackerNewsPage } from '../src/pages/HackerNewsPage';

interface LayoutShift extends PerformanceEntry {
  value: number;
}

interface LargestContentfulPaint extends PerformanceEntry {
  startTime: number;
}

interface FirstInput extends PerformanceEntry {
  processingStart: number;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
}

interface WindowWithMemory extends Window {
  performance: Performance & {
    memory?: PerformanceMemory;
  };
}

test.describe('Performance Tests', () => {
  test('should load first page within performance budget', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    
    // Start performance measurement
    const startTime = Date.now();
    await hackerNewsPage.goto();
    const loadTime = Date.now() - startTime;
    
    // Performance budgets
    const LOAD_TIME_BUDGET = 2000; // 2 seconds
    expect(loadTime).toBeLessThan(LOAD_TIME_BUDGET);
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => ({
      cls: performance.getEntriesByType('layout-shift')
        .reduce((sum, entry) => sum + (entry as LayoutShift).value, 0),
      lcp: (performance.getEntriesByType('largest-contentful-paint')
        .pop() as LargestContentfulPaint)?.startTime || 0,
      fid: (performance.getEntriesByType('first-input')
        .pop() as FirstInput)?.processingStart || 0
    }));
    
    // Core Web Vitals thresholds
    expect(webVitals.cls).toBeLessThan(0.1); // Good CLS is < 0.1
    expect(webVitals.lcp).toBeLessThan(2500); // Good LCP is < 2.5s
    expect(webVitals.fid).toBeLessThan(100); // Good FID is < 100ms
  });

  test('should maintain performance during pagination', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    const navigationTimes: number[] = [];
    const memoryUsage: number[] = [];
    
    // Measure performance across multiple page loads
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await hackerNewsPage.loadNextPage();
      navigationTimes.push(Date.now() - startTime);
      
      // Measure memory usage if available
      const memory = await page.evaluate(() => 
        ((window as unknown) as WindowWithMemory).performance.memory?.usedJSHeapSize || 0
      );
      memoryUsage.push(memory);
    }
    
    // Verify consistent navigation times
    const avgNavigationTime = navigationTimes.reduce((a, b) => a + b) / navigationTimes.length;
    const maxDeviation = Math.max(...navigationTimes.map(t => Math.abs(t - avgNavigationTime)));
    expect(maxDeviation).toBeLessThan(1000); // Max 1s deviation
  });

  test('should maintain stable memory usage during pagination', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    // Baseline memory measurement
    const baselineMemory = await page.evaluate(() => 
      ((window as unknown) as WindowWithMemory).performance.memory?.usedJSHeapSize || 0
    );
    
    // Load next page and measure memory
    await hackerNewsPage.loadNextPage();
    const afterPageLoadMemory = await page.evaluate(() => 
      ((window as unknown) as WindowWithMemory).performance.memory?.usedJSHeapSize || 0
    );
    
    // Assert memory increase is within threshold
    expect(afterPageLoadMemory - baselineMemory).toBeLessThan(5 * 1024 * 1024); // 5MB threshold
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    const startTime = Date.now();
    
    // Rapid requests to trigger rate limiting
    for (let i = 0; i < 5; i++) {
      await hackerNewsPage.loadNextPage();
    }
    
    const totalTime = Date.now() - startTime;
    const expectedMinTime = 500 * 5; // At least 500ms between requests
    
    // Verify rate limiting is working
    expect(totalTime).toBeGreaterThanOrEqual(expectedMinTime);
  });

  test('should optimize DOM operations', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    // Measure DOM query performance
    const startTime = Date.now();
    const timestamps = await hackerNewsPage.getPageTimestamps();
    const queryTime = Date.now() - startTime;
    
    // Performance budget for DOM operations
    expect(queryTime).toBeLessThan(500); // 500ms budget
    expect(timestamps.length).toBeGreaterThan(0);
  });
}); 