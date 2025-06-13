FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (with legacy peer deps support)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy all source code and email-templates
COPY . .

# Build the TypeScript project and copy email templates
RUN npm run build
RUN npm run postinstall || true

# Expose the port (change if your app uses a different port)
EXPOSE 3001

# Start the Node.js server
CMD ["npm", "start"]