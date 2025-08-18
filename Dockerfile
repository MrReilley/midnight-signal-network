# Use a standard Ubuntu base image
FROM ubuntu:22.04

# Avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies: Python, Pip, FFmpeg, Node.js, and build tools
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js using the official NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set the main application directory
WORKDIR /app

# ---- Install Python Dependencies ----
# Copy ONLY the requirements file first to leverage Docker caching
COPY services/curator/requirements.txt ./

# Install the Python packages from the requirements file
RUN pip install -r requirements.txt

# ---- VERIFICATION STEP ----
# Print all installed Python packages to the build log for debugging
RUN echo "--- INSTALLED PYTHON PACKAGES ---" && python3 -m pip list

# ---- Install Node.js Dependencies ----
RUN npm install express

# ---- Copy the application code ----
# Copy curator files to the correct location
COPY services/curator/curator.py ./curator/
# Copy streamer files
COPY services/streamer/start-stream.js ./

# Expose the port the app runs on
EXPOSE 3000

# The command to run when the container starts
CMD ["node", "start-stream.js"]