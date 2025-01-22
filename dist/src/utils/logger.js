"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAccessibilityViolation = exports.logNavigation = exports.logRateLimit = exports.logPerformance = exports.addTestContext = void 0;
const winston = require('winston');
const path = require('path');
// Custom log format
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.printf(({ level, message, timestamp, stack }) => {
    const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
}));
// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
// Configure logger with multiple transports
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console output for development
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        }),
        // File transport for errors
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});
// Add test context information
const addTestContext = (testInfo) => {
    logger.defaultMeta = {
        ...logger.defaultMeta,
        test: testInfo.title,
        file: path.basename(testInfo.file)
    };
};
exports.addTestContext = addTestContext;
// Performance logging
const logPerformance = (operation, duration) => {
    logger.info(`Performance - ${operation}: ${duration}ms`);
};
exports.logPerformance = logPerformance;
// Rate limiting logging
const logRateLimit = (action, waitTime) => {
    logger.warn(`Rate Limit - ${action}, waiting ${waitTime}ms`);
};
exports.logRateLimit = logRateLimit;
// Navigation logging
const logNavigation = (url, attempt, error) => {
    if (error) {
        logger.error(`Navigation failed to ${url} (attempt ${attempt}): ${error.message}`);
    }
    else {
        logger.info(`Successfully navigated to ${url} (attempt ${attempt})`);
    }
};
exports.logNavigation = logNavigation;
// Accessibility logging
const logAccessibilityViolation = (violation) => {
    logger.warn(`Accessibility violation - ${violation.id}: ${violation.help} (${violation.nodes.length} occurrences)`);
};
exports.logAccessibilityViolation = logAccessibilityViolation;
exports.default = logger;
