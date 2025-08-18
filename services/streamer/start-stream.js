const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONTENT_DIR = '/app/content/main_channel';
const STREAM_DIR = '/app/streams';
const PORT = process.env.PORT || 3000;

const BROADCAST_WIDTH = 480;
const BROADCAST_HEIGHT = 360;
const BROADCAST_AUDIO_RATE = 44100;

// ============================================================================
// MAIN EXECUTION LOGIC
// ============================================================================

console.log("--- Midnight Signal Service Starting ---");

// Step 1: Run the curator script to fetch content
console.log("Step 1: Running the curator script to fetch content...");
runCurator();

function runCurator() {
    // First, let's check if the curator file exists
    const curatorPath = '/app/curator/curator.py';
    if (!fs.existsSync(curatorPath)) {
        console.error(`FATAL: Curator script not found at ${curatorPath}`);
        console.log("Available files in /app:", fs.readdirSync('/app'));
        if (fs.existsSync('/app/curator')) {
            console.log("Files in /app/curator:", fs.readdirSync('/app/curator'));
        }
        process.exit(1);
    }

    console.log(`Curator script found at: ${curatorPath}`);
    console.log("Checking Python installation...");
    
    // Test Python installation first
    exec('python3 --version', (pyError, pyStdout, pyStderr) => {
        if (pyError) {
            console.error(`Python3 not found: ${pyError.message}`);
            process.exit(1);
        }
        console.log(`Python version: ${pyStdout}`);
        
        // Now run the curator
        const curator = exec(`python3 ${curatorPath}`, (error, stdout, stderr) => {
            console.log("--- Curator script has finished ---");

            if (error) {
                console.error(`FATAL: Curator script failed to execute. Error: ${error.message}`);
                console.error(`Curator STDERR: ${stderr}`);
                console.error(`Curator STDOUT: ${stdout}`);
                process.exit(1);
            }
            if (stderr && !error) {
                console.warn(`Curator STDERR (non-fatal): ${stderr}`);
            }
            console.log(`Curator STDOUT: ${stdout}`);
            
            // Check if content directory exists and has video files
            if (!fs.existsSync(CONTENT_DIR)) {
                console.error("FATAL: Content directory does not exist after curator run.");
                process.exit(1);
            }
            
            const videoFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mp4') || f.endsWith('.ogv'));
            
            if (videoFiles.length === 0) {
                console.error("FATAL: Curator ran, but no video files were found. Cannot start stream.");
                process.exit(1);
            }

            console.log(`Step 2: Video found! Starting FFmpeg stream for ${videoFiles[0]}...`);
            startStreaming(videoFiles[0]);
            
            console.log("Step 3: Starting HLS web server...");
            startWebServer();
        });
    });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function startStreaming(videoFile) {
    if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR);
    const videoPath = path.join(CONTENT_DIR, videoFile);
    const ffmpegArgs = [
        '-stream_loop', '-1', '-re', '-i', videoPath,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
        '-vf', `scale=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:force_original_aspect_ratio=decrease,pad=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:-1:-1:color=black,setsar=1,format=yuv420p`,
        '-c:a', 'aac', '-ar', BROADCAST_AUDIO_RATE.toString(), '-b:a', '96k',
        '-f', 'hls', '-hls_time', '4', '-hls_list_size', '5', '-hls_flags', 'delete_segments',
        path.join(STREAM_DIR, 'live.m3u8')
    ];
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    ffmpeg.stdout.on('data', (data) => console.log(`FFMPEG_LOG: ${data}`));
    ffmpeg.stderr.on('data', (data) => console.error(`FFMPEG_ERROR: ${data}`));
    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        if (code !== 0) process.exit(1);
    });
}

function startWebServer() {
    const app = express();
    
    // Add comprehensive CORS headers
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        
        next();
    });
    
    // Serve static files from the stream directory
    app.use('/stream', express.static(STREAM_DIR));
    
    // Add a health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Add a root endpoint that shows stream info
    app.get('/', (req, res) => {
        const streamFiles = fs.existsSync(STREAM_DIR) ? fs.readdirSync(STREAM_DIR) : [];
        res.json({
            service: 'Midnight Signal Streamer',
            status: 'running',
            streamFiles: streamFiles,
            streamUrl: '/stream/live.m3u8'
        });
    });
    
    app.listen(PORT, () => {
        console.log(`--- HLS stream server listening on port ${PORT} ---`);
        console.log(`--- Stream should be available at /stream/live.m3u8 ---`);
        console.log(`--- Health check available at /health ---`);
    });
}