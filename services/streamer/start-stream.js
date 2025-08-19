const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONTENT_DIR = '/app/content/main_channel';
const STREAM_DIR = '/app/streams';
const PORT = process.env.PORT || 3000;

// Upgraded stream quality settings
const BROADCAST_WIDTH = 854;  // 480p width
const BROADCAST_HEIGHT = 480; // 480p height
const BROADCAST_AUDIO_RATE = 44100; // 44.1kHz audio (more compatible)
const BROADCAST_AUDIO_BITRATE = '192k'; // 192k stereo audio (better quality)

// ============================================================================
// MAIN EXECUTION LOGIC
// ============================================================================

console.log("--- Midnight Signal Broadcast Engine Starting ---");

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
            const playlistFile = path.join(CONTENT_DIR, 'playlist.txt');
            
            if (videoFiles.length === 0) {
                console.error("FATAL: Curator ran, but no video files were found. Cannot start stream.");
                process.exit(1);
            }

            if (fs.existsSync(playlistFile)) {
                console.log(`Step 2: Playlist found! Starting enhanced FFmpeg stream with ${videoFiles.length} videos...`);
                startPlaylistStreaming(playlistFile);
            } else {
                console.log(`Step 2: No playlist found, using single video: ${videoFiles[0]}...`);
                startSingleVideoStreaming(videoFiles[0]);
            }
            
            console.log("Step 3: Starting HLS web server...");
            startWebServer();
        });
    });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function startPlaylistStreaming(playlistPath) {
    if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR);
    
    // Enhanced FFmpeg command for playlist streaming with better quality
    const ffmpegArgs = [
        '-re', // Read input at native frame rate
        '-f', 'concat', // Use concat demuxer for playlist
        '-safe', '0', // Allow unsafe file paths
        '-stream_loop', '-1', // Loop the entire playlist infinitely (moved before input)
        '-i', playlistPath, // Input playlist
        '-c:v', 'libx264', // Video codec
        '-preset', 'ultrafast', // Fast encoding
        '-tune', 'zerolatency', // Optimize for streaming
        '-crf', '23', // Constant rate factor for quality
        '-maxrate', '1000k', // Maximum bitrate
        '-bufsize', '2000k', // Buffer size
        '-vf', `scale=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:force_original_aspect_ratio=decrease,pad=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:-1:-1:color=black,setsar=1,format=yuv420p`, // Video filter
        '-c:a', 'aac', // Audio codec
        '-ar', BROADCAST_AUDIO_RATE.toString(), // Audio sample rate
        '-b:a', BROADCAST_AUDIO_BITRATE, // Audio bitrate
        '-ac', '2', // Stereo audio
        '-af', 'volume=1.5', // Boost audio volume
        '-f', 'hls', // HLS format
        '-hls_time', '4', // Segment duration
        '-hls_list_size', '5', // Number of segments in playlist
        '-hls_flags', 'delete_segments+append_list', // Delete old segments and append new ones
        '-hls_segment_filename', path.join(STREAM_DIR, 'live%03d.ts'), // Segment filename pattern
        path.join(STREAM_DIR, 'live.m3u8') // Output playlist
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    // Reduced logging to avoid Railway rate limits
    let lastLogTime = Date.now();
    ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        const now = Date.now();
        
        // Only log errors and important messages, not progress
        if (output.includes('Error') || output.includes('error') || output.includes('failed')) {
            console.error(`FFMPEG_ERROR: ${output}`);
        } else if (output.includes('Opening') || output.includes('Duration') || output.includes('Stream')) {
            // Log important info but limit frequency
            if (now - lastLogTime > 10000) { // Only log every 10 seconds
                console.log(`FFMPEG_INFO: ${output.split('\n')[0]}`); // Only first line
                lastLogTime = now;
            }
        }
        // Skip progress output entirely to reduce log volume
    });
    
    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        if (code !== 0) process.exit(1);
    });
}

function startSingleVideoStreaming(videoFile) {
    if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR);
    const videoPath = path.join(CONTENT_DIR, videoFile);
    
    // Enhanced FFmpeg command for single video with better quality
    const ffmpegArgs = [
        '-stream_loop', '-1', // Loop the video infinitely (moved before input)
        '-re', // Read input at native frame rate
        '-i', videoPath, // Input video
        '-c:v', 'libx264', // Video codec
        '-preset', 'ultrafast', // Fast encoding
        '-tune', 'zerolatency', // Optimize for streaming
        '-crf', '23', // Constant rate factor for quality
        '-maxrate', '1000k', // Maximum bitrate
        '-bufsize', '2000k', // Buffer size
        '-vf', `scale=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:force_original_aspect_ratio=decrease,pad=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:-1:-1:color=black,setsar=1,format=yuv420p`, // Video filter
        '-c:a', 'aac', // Audio codec
        '-ar', BROADCAST_AUDIO_RATE.toString(), // Audio sample rate
        '-b:a', BROADCAST_AUDIO_BITRATE, // Audio bitrate
        '-ac', '2', // Stereo audio
        '-af', 'volume=1.5', // Boost audio volume
        '-f', 'hls', // HLS format
        '-hls_time', '4', // Segment duration
        '-hls_list_size', '5', // Number of segments in playlist
        '-hls_flags', 'delete_segments', // Delete old segments
        path.join(STREAM_DIR, 'live.m3u8') // Output playlist
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    // Reduced logging to avoid Railway rate limits
    let lastLogTime = Date.now();
    ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        const now = Date.now();
        
        // Only log errors and important messages, not progress
        if (output.includes('Error') || output.includes('error') || output.includes('failed')) {
            console.error(`FFMPEG_ERROR: ${output}`);
        } else if (output.includes('Opening') || output.includes('Duration') || output.includes('Stream')) {
            // Log important info but limit frequency
            if (now - lastLogTime > 10000) { // Only log every 10 seconds
                console.log(`FFMPEG_INFO: ${output.split('\n')[0]}`); // Only first line
                lastLogTime = now;
            }
        }
        // Skip progress output entirely to reduce log volume
    });
    
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
        const videoFiles = fs.existsSync(CONTENT_DIR) ? fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mp4')) : [];
        res.json({
            service: 'Midnight Signal Broadcast Engine',
            status: 'running',
            streamQuality: `${BROADCAST_WIDTH}x${BROADCAST_HEIGHT} @ ${BROADCAST_AUDIO_BITRATE}`,
            videosInPlaylist: videoFiles.length,
            streamFiles: streamFiles,
            streamUrl: '/stream/live.m3u8'
        });
    });
    
    app.listen(PORT, () => {
        console.log(`--- HLS stream server listening on port ${PORT} ---`);
        console.log(`--- Stream quality: ${BROADCAST_WIDTH}x${BROADCAST_HEIGHT} @ ${BROADCAST_AUDIO_BITRATE} ---`);
        console.log(`--- Stream available at /stream/live.m3u8 ---`);
        console.log(`--- Health check available at /health ---`);
    });
}