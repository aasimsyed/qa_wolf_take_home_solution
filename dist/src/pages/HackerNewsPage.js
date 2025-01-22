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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HackerNewsPage = void 0;
const logger_1 = __importStar(require("../utils/logger"));
class HackerNewsPage {
    page;
    // Static configuration
    static BASE_URL = 'https://news.ycombinator.com/newest';
    static ARTICLES_PER_PAGE = 30;
    static MIN_ARTICLES_REQUIRED = 100;
    // Core page element locators
    articleRows;
    articleDates;
    moreLink;
    firstArticleRow;
    constructor(page) {
        this.page = page;
        // Initialize locators for key page elements
        this.articleRows = page.locator('tr.athing');
        this.articleDates = page.locator('span.age');
        this.moreLink = page.locator('a.morelink').first();
        this.firstArticleRow = this.articleRows.first();
    }
    /**
     * Extracts and parses ISO timestamp from title attribute
     * Format: "YYYY-MM-DDTHH:mm:ss epochtime" -> Date object
     */
    parseTimestamp(title) {
        const [isoString] = title.split(' ');
        return new Date(isoString);
    }
    /**
     * Navigates to the newest articles page with retry logic
     * Uses parallel loading and DOM state verification
     * Implements exponential backoff for retries
     */
    async goto() {
        const maxRetries = 3;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                if (global.requestGuard?.waitForRequest) {
                    await global.requestGuard.waitForRequest();
                    (0, logger_1.logRateLimit)('Navigation', 2000);
                }
                await Promise.all([
                    this.page.goto(HackerNewsPage.BASE_URL),
                    this.page.waitForURL(HackerNewsPage.BASE_URL, {
                        timeout: 60000,
                        waitUntil: 'domcontentloaded'
                    }),
                    this.articleRows.first().waitFor({ state: 'visible', timeout: 60000 })
                ]);
                const duration = Date.now() - startTime;
                (0, logger_1.logNavigation)(HackerNewsPage.BASE_URL, attempt);
                (0, logger_1.logPerformance)('Page Navigation', duration);
                return;
            }
            catch (error) {
                lastError = error;
                (0, logger_1.logNavigation)(HackerNewsPage.BASE_URL, attempt, error);
                if (attempt < maxRetries) {
                    const waitTime = 2000 * attempt;
                    logger_1.default.warn(`Navigation attempt ${attempt} failed, waiting ${waitTime}ms before retry...`);
                    await this.page.waitForLoadState('domcontentloaded', { timeout: waitTime });
                }
            }
        }
        throw lastError;
    }
    /**
     * Ensures articles are loaded and visible on the page
     * Handles rate limiting by detecting and responding to rate limit messages
     * Implements retry logic with rate limit detection
     */
    async waitForArticles(timeout = 45000) {
        const maxRetries = 3;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const startTime = Date.now();
            try {
                await Promise.all([
                    this.page.waitForLoadState('domcontentloaded'),
                    this.articleRows.first().waitFor({ state: 'visible', timeout })
                ]);
                const duration = Date.now() - startTime;
                (0, logger_1.logPerformance)('Articles Load', duration);
                return;
            }
            catch (error) {
                lastError = error;
                logger_1.default.error(`Failed to wait for articles (attempt ${attempt}): ${error}`);
                try {
                    const rateLimitText = await this.page.getByText('Rate limit exceeded').isVisible();
                    if (rateLimitText) {
                        logger_1.default.warn('Rate limit detected, attempting recovery...');
                        const reloadLink = this.page.getByRole('link', { name: 'reload' });
                        if (await reloadLink.isVisible()) {
                            await Promise.all([
                                this.page.waitForResponse(res => res.url().includes('news.ycombinator.com')),
                                reloadLink.click()
                            ]);
                            logger_1.default.info('Recovery successful via reload link');
                        }
                        else {
                            await Promise.all([
                                this.page.waitForResponse(res => res.url().includes('news.ycombinator.com')),
                                this.page.reload()
                            ]);
                            logger_1.default.info('Recovery successful via page refresh');
                        }
                        continue;
                    }
                }
                catch (e) {
                    logger_1.default.warn('Could not check for rate limit, continuing with retry');
                }
                if (attempt === maxRetries) {
                    throw lastError;
                }
            }
        }
    }
    /**
     * Navigates to the next page of articles
     */
    async loadNextPage() {
        const startTime = Date.now();
        try {
            await this.moreLink.waitFor({ state: 'visible', timeout: 60000 });
            await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
            await Promise.all([
                this.page.waitForLoadState('domcontentloaded', { timeout: 60000 }),
                this.moreLink.click({ timeout: 60000 })
            ]);
            await this.firstArticleRow.waitFor({ state: 'visible', timeout: 60000 });
            await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
            const duration = Date.now() - startTime;
            (0, logger_1.logPerformance)('Next Page Load', duration);
        }
        catch (error) {
            logger_1.default.error(`Failed to load next page: ${error}`);
            throw error;
        }
    }
    /**
     * Retrieves timestamps for articles on the current page
     * Uses optimized batch DOM query and in-memory processing
     */
    async getPageTimestamps() {
        const startTime = Date.now();
        try {
            const dates = await this.articleDates.evaluateAll(elements => elements.map(el => el.getAttribute('title')));
            const timestamps = dates
                .filter((title) => title !== null)
                .map(title => this.parseTimestamp(title));
            const duration = Date.now() - startTime;
            (0, logger_1.logPerformance)('Timestamp Collection', duration);
            return timestamps;
        }
        catch (error) {
            logger_1.default.error(`Failed to get page timestamps: ${error}`);
            throw error;
        }
    }
    /**
     * Retrieves timestamps for the specified number of articles
     * Handles pagination with rate limit prevention
     * Returns exactly the requested number of timestamps
     */
    async getArticleTimestamps(count = HackerNewsPage.MIN_ARTICLES_REQUIRED) {
        const timestamps = [];
        const pagesNeeded = Math.ceil(count / HackerNewsPage.ARTICLES_PER_PAGE);
        for (let page = 0; page < pagesNeeded; page++) {
            if (page > 0) {
                // Wait for rate limit guard before loading next page
                await global.requestGuard?.waitForRequest();
                await this.loadNextPage();
            }
            const pageTimestamps = await this.getPageTimestamps();
            timestamps.push(...pageTimestamps);
            if (timestamps.length >= count) {
                return timestamps.slice(0, count);
            }
        }
        throw new Error(`Could not load enough articles. Required: ${count}, Found: ${timestamps.length}`);
    }
}
exports.HackerNewsPage = HackerNewsPage;
