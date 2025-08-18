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

# Set the working directory inside the container
WORKDIR /app

# Copy the streamer and curator code into the container
COPY . .
COPY ../curator ./curator

# Install Python and Node.js dependencies
RUN pip install internetarchive requests
RUN npm install express

# Tell Railway that our service will be listening on this port
EXPOSE 3000

# The command to run when the container starts
CMD ["node", "start-stream.js"]