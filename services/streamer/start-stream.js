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
console.log("Step 1: Running the curator script to fetch content...");

// Use python3 -u for unbuffered output to see logs in real-time
const curator = exec('python3 -u /app/curator/curator.py', (error, stdout, stderr) => {
    console.log("--- Curator script has finished ---");

    if (error) {
        console.error(`FATAL: Curator script failed to execute. Error: ${error.message}`);
        console.error(`Full error object:`, error);
        process.exit(1); // Exit with an error code
    }
    if (stderr) {
        console.error(`Curator script STDERR: ${stderr}`);
    }
    console.log(`Curator script STDOUT: ${stdout}`);
    
    // Now that the curator is done, check for the video file
    const videoFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mp4') || f.endsWith('.ogv'));
    
    if (videoFiles.length === 0) {
        console.error("FATAL: Curator ran, but no video files were found. Cannot start stream.");
        process.exit(1); // Exit with an error code
    }

    // If we have a video, start the stream and the server
    console.log(`Step 2: Video found! Starting FFmpeg stream for ${videoFiles[0]}...`);
    startStreaming(videoFiles[0]);
    
    console.log("Step 3: Starting HLS web server...");
    startWebServer();
});


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function startStreaming(videoFile) {
    if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR);
    
    const videoPath = path.join(CONTENT_DIR, videoFile);

    const ffmpegArgs = [
        '-stream_loop', '-1',
        '-re',
        '-i', videoPath,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
        '-vf', `scale=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:force_original_aspect_ratio=decrease,pad=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:-1:-1:color=black,setsar=1,format=yuv420p`,
        '-c:a', 'aac', '-ar', BROADCAST_AUDIO_RATE.toString(), '-b:a', '96k',
        '-f', 'hls', '-hls_time', '4', '-hls_list_size', '5',
        '-hls_flags', 'delete_segments',
        path.join(STREAM_DIR, 'live.m3u8')
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stdout.on('data', (data) => console.log(`FFMPEG_LOG: ${data}`));
    ffmpeg.stderr.on('data', (data) => console.error(`FFMPEG_ERROR: ${data}`));
    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        // If ffmpeg stops, we should probably stop the whole service
        if (code !== 0) {
            process.exit(1);
        }
    });
}

function startWebServer() {
    const app = express();
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
    });
    app.use('/stream', express.static(STREAM_DIR)); // Serve from /stream endpoint
    
    app.listen(PORT, () => {
        console.log(`--- HLS stream server listening on port ${PORT} ---`);
        console.log(`--- Stream should be available at /stream/live.m3u8 ---`);
    });
}