"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const HackerNewsPage_1 = require("../src/pages/HackerNewsPage");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
const logger_1 = __importStar(require("../utils/logger"));
test_1.test.describe('Hacker News Accessibility Tests', () => {
    test_1.test.beforeEach(async ({}, testInfo) => {
        (0, logger_1.addTestContext)(testInfo);
    });
    (0, test_1.test)('should document accessibility status', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        logger_1.default.info('Starting accessibility scan...');
        const startTime = Date.now();
        // Run accessibility scan
        const accessibilityScanResults = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        const duration = Date.now() - startTime;
        logger_1.default.info(`Accessibility scan completed in ${duration}ms`);
        // Document known issues
        const knownIssues = {
            'image-alt': 'Images missing alternative text',
            'label': 'Form elements missing labels',
            'color-contrast': 'Insufficient color contrast in UI elements',
            'link-name': 'Links without discernible text'
        };
        // Log violations for documentation
        logger_1.default.info('Known accessibility issues:');
        accessibilityScanResults.violations.forEach(violation => {
            (0, logger_1.logAccessibilityViolation)(violation);
        });
        // Only fail on unexpected violations
        const unexpectedViolations = accessibilityScanResults.violations.filter(violation => !knownIssues[violation.id]);
        if (unexpectedViolations.length > 0) {
            logger_1.default.error(`Found ${unexpectedViolations.length} unexpected accessibility violations`);
        }
        (0, test_1.expect)(unexpectedViolations).toEqual([]);
    });
    (0, test_1.test)('should have proper heading structure', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
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
            (0, test_1.expect)(heading.level).toBeLessThanOrEqual(prevLevel + 1);
            return heading.level;
        }, 0);
    });
    (0, test_1.test)('should have sufficient color contrast', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        const contrastResults = await new playwright_1.default({ page })
            .withTags(['color-contrast'])
            .analyze();
        (0, test_1.expect)(contrastResults.violations).toEqual([]);
    });
    (0, test_1.test)('should have proper ARIA attributes', async ({ page }) => {
        const hackerNewsPage = new HackerNewsPage_1.HackerNewsPage(page);
        await hackerNewsPage.goto();
        const ariaResults = await new playwright_1.default({ page })
            .withTags(['aria'])
            .analyze();
        (0, test_1.expect)(ariaResults.violations).toEqual([]);
    });
});
