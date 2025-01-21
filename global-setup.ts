// Track request timestamps to prevent rate limiting
const requestTimestamps: number[] = [];
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

async function globalSetup() {
  // Set up global rate limiting protection
  const requestGuard = {
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
    waitForRequest: async function() {
      while (!this.canMakeRequest()) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      this.recordRequest();
    }
  };
  
  global.requestGuard = requestGuard;
}

export default globalSetup; 