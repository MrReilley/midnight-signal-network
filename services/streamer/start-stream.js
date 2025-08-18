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

// Step 1: Run a diagnostic command to check the environment
console.log("Step 1: Running environment diagnostics...");
exec('echo "--- Environment Diagnostics ---" && whoami && echo "PATH: $PATH" && ls -l /usr/bin/python3', (diagError, diagStdout, diagStderr) => {
    console.log(diagStdout);
    if (diagStderr) {
        console.error("Diagnostics STDERR:", diagStderr);
    }
    if (diagError) {
        console.error("FATAL: Could not run diagnostic command.", diagError);
        process.exit(1);
    }

    // Step 2: Now run the curator script using its absolute path
    console.log("Step 2: Running the curator script to fetch content...");
    runCurator();
});


function runCurator() {
    // USE THE ABSOLUTE PATH to the python executable.
    const curator = exec('/usr/bin/python3 -u /app/curator/curator.py', (error, stdout, stderr) => {
        console.log("--- Curator script has finished ---");

        if (error) {
            console.error(`FATAL: Curator script failed to execute. Error: ${error.message}`);
            // It is critical to log stderr as it often contains the actual Python error
            console.error(`Curator STDERR: ${stderr}`);
            process.exit(1);
        }
        if (stderr && !error) {
            // Sometimes IA library prints warnings to stderr, which is fine.
            console.warn(`Curator STDERR (non-fatal): ${stderr}`);
        }
        console.log(`Curator STDOUT: ${stdout}`);
        
        const videoFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mp4') || f.endsWith('.ogv'));
        
        if (videoFiles.length === 0) {
            console.error("FATAL: Curator ran, but no video files were found. Cannot start stream.");
            process.exit(1);
        }

        console.log(`Step 3: Video found! Starting FFmpeg stream for ${videoFiles[0]}...`);
        startStreaming(videoFiles[0]);
        
        console.log("Step 4: Starting HLS web server...");
        startWebServer();
    });
}


// ============================================================================
// HELPER FUNCTIONS (These remain unchanged)
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
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
    });
    app.use('/stream', express.static(STREAM_DIR));
    app.listen(PORT, () => {
        console.log(`--- HLS stream server listening on port ${PORT} ---`);
        console.log(`--- Stream should be available at /stream/live.m3u8 ---`);
    });
}