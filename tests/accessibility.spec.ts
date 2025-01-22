import { test, expect } from '@playwright/test';
import { HackerNewsPage } from '../src/pages/HackerNewsPage';
import AxeBuilder from '@axe-core/playwright';
import logger, { addTestContext, logAccessibilityViolation } from '../src/utils/logger';

test.describe('Hacker News Accessibility Tests', () => {
  test.beforeEach(async ({ }, testInfo) => {
    addTestContext(testInfo);
  });

  test('should document accessibility status', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    logger.info('Starting accessibility scan...');
    const startTime = Date.now();
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const duration = Date.now() - startTime;
    logger.info(`Accessibility scan completed in ${duration}ms`);
    
    // Document known issues
    const knownIssues: Record<string, string> = {
      'image-alt': 'Images missing alternative text',
      'label': 'Form elements missing labels',
      'color-contrast': 'Insufficient color contrast in UI elements',
      'link-name': 'Links without discernible text'
    };

    // Log violations for documentation
    logger.info('Known accessibility issues:');
    accessibilityScanResults.violations.forEach(violation => {
      logAccessibilityViolation(violation);
    });

    // Only fail on unexpected violations
    const unexpectedViolations = accessibilityScanResults.violations.filter(
      violation => !knownIssues[violation.id]
    );
    
    logger.info(`Found ${unexpectedViolations.length} accessibility violations`);
    expect(unexpectedViolations).toEqual([]);
  });

  test('should have proper heading structure', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    // Check heading hierarchy
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(heading => ({
          level: parseInt(heading.tagName[1]),
          text: heading.textContent?.trim()
        }));
    });
    
    // Verify each heading level is at most one level deeper than the previous
    headings.reduce((prevLevel, heading) => {
      expect(heading.level).toBeLessThanOrEqual(prevLevel + 1);
      return heading.level;
    }, 0);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();
    
    expect(contrastResults.violations).toEqual([]);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    const hackerNewsPage = new HackerNewsPage(page);
    await hackerNewsPage.goto();
    
    const ariaResults = await new AxeBuilder({ page })
      .withTags(['aria'])
      .analyze();
    
    expect(ariaResults.violations).toEqual([]);
  });
}); 