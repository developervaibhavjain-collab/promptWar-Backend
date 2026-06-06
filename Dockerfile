## Use official Node.js LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port (matches app.js default)
EXPOSE 5000

# Use environment variables for configuration in production
CMD [ "node", "app.js" ]
