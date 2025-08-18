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

# ---- Curator Setup ----
# Copy the curator code into a /app/curator directory
COPY services/curator/curator.py ./curator/

# ---- Streamer Setup ----
# Copy the streamer code into a /app/streamer directory
COPY services/streamer/start-stream.js ./streamer/
# If you have a package.json, copy it now
# COPY services/streamer/package.json ./streamer/

# ---- Install Dependencies ----
# We can now run npm install in the correct directory
RUN pip install internetarchive requests
RUN npm install express

# Tell Railway that our service will be listening on this port
EXPOSE 3000

# The command to run when the container starts
# We specify the correct path to the script
CMD ["node", "streamer/start-stream.js"]