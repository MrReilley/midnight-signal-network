# Use a standard Ubuntu base image
FROM ubuntu:22.04

# Avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all necessary software: Node, Python, FFmpeg
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
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

# (Optional but good practice) If you have a package.json for your streamer,
# you would copy it here and run npm install
# COPY services/streamer/package.json ./streamer/
# RUN cd streamer && npm install

# ---- Install Dependencies ----
# Install Python and Node.js dependencies in the main app directory
RUN pip install internetarchive requests
RUN npm install express

# Tell Railway that our service will be listening on this port
EXPOSE 3000

# The command to run when the container starts
# We specify the correct path to the script
CMD ["node", "streamer/start-stream.js"]