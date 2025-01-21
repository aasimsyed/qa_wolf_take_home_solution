FROM mcr.microsoft.com/playwright:v1.42.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Install Playwright browsers
RUN npx playwright install --with-deps chromium firefox webkit

# Set environment variables
ENV CI=true
ENV NODE_ENV=test

# Command to run tests
CMD ["npm", "test"] 