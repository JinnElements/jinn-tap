# Use Node.js LTS version as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port the collab-server will run on
EXPOSE 8082

# Define non-sensitive environment variables
ENV PORT=8082

# Command to run the collab-server
CMD ["npm", "run", "collab-server"]
