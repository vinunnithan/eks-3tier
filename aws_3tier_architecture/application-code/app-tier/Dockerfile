# Use a slim, specific Node version — matches your original AWS PoC's Node runtime expectations
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only package files first (better layer caching — deps only reinstall if these change)
COPY package*.json ./

# Install only production dependencies (no dev/test tooling needed at runtime)
RUN npm install --omit=dev

# Now copy the rest of the app source
COPY . .

# Document which port the app listens on (informational — doesn't actually publish it)
EXPOSE 4000

# Basic container-level health check, hits the same /health route we saw in index.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["npm", "start"]