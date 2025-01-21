import { Page, Locator } from '@playwright/test';

export class HackerNewsPage {
  // Static configuration
  private static readonly BASE_URL = 'https://news.ycombinator.com/newest';
  private static readonly ARTICLES_PER_PAGE = 30;
  private static readonly MIN_ARTICLES_REQUIRED = 100;

  // Core page element locators
  private readonly articleRows: Locator;
  private readonly articleDates: Locator;
  private readonly moreLink: Locator;
  private readonly firstArticleRow: Locator;

  constructor(private readonly page: Page) {
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
  private parseTimestamp(title: string): Date {
    const [isoString] = title.split(' ');
    return new Date(isoString);
  }

  /**
   * Navigates to the newest articles page with retry logic
   * Uses parallel loading and DOM state verification
   * Implements exponential backoff for retries
   */
  async goto(): Promise<void> {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait for rate limit guard before navigation
        if (global.requestGuard?.waitForRequest) {
          await global.requestGuard.waitForRequest();
        }
        
        // Parallel navigation and content verification
        await Promise.all([
          this.page.goto(HackerNewsPage.BASE_URL),
          this.page.waitForURL(HackerNewsPage.BASE_URL, { 
            timeout: 60000,
            waitUntil: 'domcontentloaded'
          }),
          this.articleRows.first().waitFor({ state: 'visible', timeout: 60000 })
        ]);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`Navigation attempt ${attempt} failed, waiting before retry...`);
          await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 * attempt });
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
  public async waitForArticles(timeout: number = 45000): Promise<void> {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait for both DOM content and article visibility
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          this.articleRows.first().waitFor({ state: 'visible', timeout })
        ]);
        return;
      } catch (error) {
        lastError = error;
        
        // Handle rate limiting with automatic recovery
        try {
          const rateLimitText = await this.page.getByText('Rate limit exceeded').isVisible();
          if (rateLimitText) {
            console.log('Rate limit detected, retrying...');
            
            // Attempt recovery via reload link or page refresh
            const reloadLink = this.page.getByRole('link', { name: 'reload' });
            if (await reloadLink.isVisible()) {
              await Promise.all([
                this.page.waitForResponse(res => res.url().includes('news.ycombinator.com')),
                reloadLink.click()
              ]);
            } else {
              await Promise.all([
                this.page.waitForResponse(res => res.url().includes('news.ycombinator.com')),
                this.page.reload()
              ]);
            }
            continue;
          }
        } catch (e) {
          console.log('Could not check for rate limit, continuing with retry');
        }
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        try {
          await this.page.waitForLoadState('domcontentloaded');
        } catch (e) {
          console.log('Could not wait for load state, continuing with retry');
        }
      }
    }
  }

  /**
   * Navigates to the next page of articles
   */
  public async loadNextPage(): Promise<void> {
    // Ensure "More" link is available and wait for it to be stable
    await this.moreLink.waitFor({ state: 'visible', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
    
    // Click and wait for navigation to complete
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded', { timeout: 60000 }),
      this.moreLink.click({ timeout: 60000 })
    ]);
    
    // Wait for articles to be visible after navigation
    await this.firstArticleRow.waitFor({ state: 'visible', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
  }

  /**
   * Retrieves timestamps for articles on the current page
   * Uses optimized batch DOM query and in-memory processing
   */
  public async getPageTimestamps(): Promise<Date[]> {
    // Single DOM query for all date elements
    const dates = await this.articleDates.evaluateAll(elements => 
      elements.map(el => el.getAttribute('title'))
    );
    
    // Process all timestamps in memory
    return dates
      .filter((title): title is string => title !== null)
      .map(title => this.parseTimestamp(title));
  }

  /**
   * Retrieves timestamps for the specified number of articles
   * Handles pagination with rate limit prevention
   * Returns exactly the requested number of timestamps
   */
  async getArticleTimestamps(count: number = HackerNewsPage.MIN_ARTICLES_REQUIRED): Promise<Date[]> {
    const timestamps: Date[] = [];
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