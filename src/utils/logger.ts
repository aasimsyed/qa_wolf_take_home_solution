import winston from 'winston';
import path from 'path';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Configure logger with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
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
export const addTestContext = (testInfo: { title: string; file: string }) => {
  logger.defaultMeta = {
    ...logger.defaultMeta,
    test: testInfo.title,
    file: path.basename(testInfo.file)
  };
};

// Performance logging
export const logPerformance = (operation: string, duration: number) => {
  logger.info(`Performance - ${operation}: ${duration}ms`);
};

// Rate limiting logging
export const logRateLimit = (action: string, waitTime: number) => {
  logger.warn(`Rate Limit - ${action}, waiting ${waitTime}ms`);
};

// Navigation logging
export const logNavigation = (url: string, attempt: number, error?: Error) => {
  if (error) {
    logger.error(`Navigation failed to ${url} (attempt ${attempt}): ${error.message}`);
  } else {
    logger.info(`Successfully navigated to ${url} (attempt ${attempt})`);
  }
};

interface ViolationNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

// Accessibility logging
export const logAccessibilityViolation = (violation: { 
  id: string; 
  help: string; 
  nodes: ViolationNode[] 
}) => {
  logger.warn(`Accessibility violation - ${violation.id}: ${violation.help} (${violation.nodes.length} occurrences)`);
};

export default logger; 