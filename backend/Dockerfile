FROM node:22-bookworm-slim

# Install system media dependencies: ffmpeg, ffprobe, python3, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy server code
COPY server.ts tsconfig.json ./

# Create persistent downloads directory
RUN mkdir -p /app/downloads

ENV NODE_ENV=production
ENV PORT=3001
ENV CLIPSTREAM_DOWNLOAD_DIR=/app/downloads
ENV CLIPSTREAM_FFMPEG_PATH=/usr/bin/ffmpeg
ENV CLIPSTREAM_FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 3001

CMD ["npm", "start"]
