declare global {
  interface Window {
    requestGuard?: {
      canMakeRequest(): boolean;
      recordRequest(): void;
      waitForRequest(): Promise<void>;
    }
  }
  // eslint-disable-next-line no-var
  var requestGuard: Window['requestGuard'];
}

export {}; 