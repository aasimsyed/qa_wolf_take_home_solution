"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function globalTeardown() {
    // Clean up global request guard
    delete global.requestGuard;
}
exports.default = globalTeardown;
