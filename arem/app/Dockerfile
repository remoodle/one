FROM node:24-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Set timezone
RUN export TZ="Asia/Almaty" \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

ARG VERSION_TAG
ENV VERSION_TAG=$VERSION_TAG

# Run the service
CMD node ./dist/services/$SERVICE_NAME/index.cjs