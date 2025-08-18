# Use an official Node.js image, which includes Node, npm, and a base OS
FROM node:20-slim

# Install FFmpeg and Python
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set the main application directory
WORKDIR /app

# Copy the curator code
COPY services/curator/curator_mvp.py ./curator/

# Copy the streamer's package.json
COPY services/streamer/package.json .

# Install Node.js and Python dependencies
RUN npm install
RUN pip install internetarchive requests

# Copy the rest of the streamer code
COPY services/streamer/start-stream.js .

# Tell Railway what port our service listens on
EXPOSE 3000

# The command to run when the container starts
CMD ["npm", "start"]