async function globalTeardown() {
  // Clean up global request guard
  delete global.requestGuard;
}

export default globalTeardown; 