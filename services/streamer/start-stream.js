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

// 1. Run the curator once to get content
console.log("Running initial content curator...");
const curator = exec('python3 /app/curator/curator.py', (error, stdout, stderr) => {
    if (error) {
        console.error(`Curator script error: ${error}`);
        return;
    }
    console.log(`Curator output: ${stdout}`);
    console.error(`Curator stderr: ${stderr}`);
    
    // 2. After curator is done, start the stream
    startStreaming();
});

function startStreaming() {
    if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR);
    
    const videoFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mp4'));
    if (videoFiles.length === 0) {
        console.error("No video files found after curation. Cannot start stream.");
        return;
    }

    console.log("Found content, starting FFmpeg stream...");

    const ffmpegArgs = [
        '-stream_loop', '-1',
        '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=${BROADCAST_AUDIO_RATE}`,
        '-re',
        '-i', path.join(CONTENT_DIR, videoFiles[0]),
        '-filter_complex', `[1:v]scale=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:force_original_aspect_ratio=decrease,pad=${BROADCAST_WIDTH}:${BROADCAST_HEIGHT}:-1:-1:color=black,setsar=1,format=yuv420p[outv];[1:a][0:a]amerge=inputs=2,pan=stereo|c0<c0|c1<c1[outa]`,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '30',
        '-c:a', 'aac', '-ar', BROADCAST_AUDIO_RATE.toString(), '-b:a', '96k',
        '-f', 'hls', '-hls_time', '4', '-hls_list_size', '5',
        '-hls_flags', 'delete_segments',
        path.join(STREAM_DIR, 'live.m3u8')
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stdout.on('data', (data) => console.log(`FFMPEG: ${data}`));
    ffmpeg.stderr.on('data', (data) => console.error(`FFMPEG_ERROR: ${data}`));
    ffmpeg.on('close', (code) => console.log(`FFmpeg process exited with code ${code}`));
}

// 3. Start a simple web server to serve the HLS files
const app = express();
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
app.use(express.static(STREAM_DIR));
app.listen(PORT, () => {
    console.log(`HLS stream server listening on port ${PORT}`);
});