// Utility for rate limiting and retrying API calls
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastCallTime = 0;
  private minDelay = 1000; // Minimum 1 second between calls
  private maxRetries = 3;
  private retryDelay = 2000; // Start with 2 second delay

  async addToQueue<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let retries = 0;
        while (retries <= this.maxRetries) {
          try {
            // Ensure minimum delay between calls
            const now = Date.now();
            const timeSinceLastCall = now - this.lastCallTime;
            if (timeSinceLastCall < this.minDelay) {
              await new Promise(r => setTimeout(r, this.minDelay - timeSinceLastCall));
            }

            const result = await apiCall();
            this.lastCallTime = Date.now();
            resolve(result);
            return;
          } catch (error: any) {
            if (error.message.includes('429') && retries < this.maxRetries) {
              // If rate limited, wait and retry
              retries++;
              await new Promise(r => setTimeout(r, this.retryDelay * retries));
              continue;
            }
            reject(error);
            return;
          }
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const nextCall = this.queue.shift();
      if (nextCall) {
        await nextCall();
      }
    }
    this.processing = false;
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter(); 