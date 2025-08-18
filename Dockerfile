# Use a standard Ubuntu base image
FROM ubuntu:22.04

# Avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# ---- CORRECTED NODE.JS INSTALLATION ----
# Install curl, then use the NodeSource script to add the repository for Node.js 20.x
# Then install Node.js itself.
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install other necessary software: Python, FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set the main application directory
WORKDIR /app

# ---- Install Python Dependencies FIRST ----
# Copy the requirements file and install dependencies. This is better for caching.
COPY services/curator/requirements.txt ./
RUN pip install -r requirements.txt

# ---- Install Node.js Dependencies ----
# (This is the optional but recommended way using package.json)
# If you don't have one, the 'RUN npm install express' later is fine.
# COPY services/streamer/package.json ./
# RUN npm install

# ---- Copy Application Code ----
COPY services/curator/curator.py ./curator/
COPY services/streamer/start-stream.js ./streamer/

# If not using package.json, install express now
RUN npm install express

# Tell the service that our service will be listening on this port
EXPOSE 3000

# The command to run when the container starts
CMD ["node", "streamer/start-stream.js"]