'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const streamUrl = 'https://midnight-signal-network-production.up.railway.app/stream/live.m3u8';

export default function HomePage() {
  const videoRef = useRef(null);
  const hlsInstance = useRef(null);
  const videoContainerRef = useRef(null);

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentVideo, setCurrentVideo] = useState('Loading...');
  const [nextVideo, setNextVideo] = useState('Loading...');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // --- Prevent Seeking ---
    const preventSeek = () => {
      // Snap back to the live edge if a seek is attempted
      if (hlsInstance.current && video.duration) {
        const liveEdge = hlsInstance.current.liveSyncPosition;
        // A buffer of 1 second helps prevent constant snapping on minor delays
        if (liveEdge && Math.abs(video.currentTime - liveEdge) > 1) {
          console.log("Seek attempt blocked. Snapping back to live.");
          video.currentTime = liveEdge;
        }
      }
    };
    video.addEventListener('seeking', preventSeek);

    // Update time display
    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };
    video.addEventListener('timeupdate', updateTime);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsInstance.current = hls; // Store instance for seeking logic

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsLive(true);
        video.volume = volume;
        video.muted = isMuted;
        video.play().catch(() => {
          setError("Click anywhere to start broadcast");
          setIsLoading(false);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError(`Signal Lost: ${data.details}`);
          setIsLoading(false);
          setIsLive(false);
        }
      });

      // Listen for segment changes to update video info
      hls.on(Hls.Events.FRAG_LOADED, () => {
        // This is a simplified approach - in a real implementation you'd track playlist changes
        setCurrentVideo('Random Archive Video');
        setNextVideo('Random Archive Video');
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support
      video.src = streamUrl;
      // ... (add native support logic here if needed)
    }

    // --- Cleanup ---
    return () => {
      video.removeEventListener('seeking', preventSeek);
      video.removeEventListener('timeupdate', updateTime);
      if (hlsInstance.current) {
        hlsInstance.current.destroy();
      }
    };
  }, [isMuted, volume]);

  const handleUserInteraction = () => {
    // This allows the user to start playback if autoplay is blocked
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play();
      setError(null);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeLeft = () => {
    if (!duration || !currentTime) return '00:00';
    const timeLeft = duration - currentTime;
    return formatTime(timeLeft);
  };

  return (
    <div className="min-h-screen crt-screen dark-theme" onClick={handleUserInteraction}>
      <main className="relative flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-6 z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-cyan-300 mb-2 text-glow uppercase">
            Midnight Signal
          </h1>
          <p className="text-lg text-gray-400 text-subtle-glow">
            Broadcasting from the digital ether...
          </p>
        </div>

        <div className="relative w-full max-w-4xl z-10 video-frame" ref={videoContainerRef}>
          <div
            className="relative bg-black aspect-video"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <p className="text-2xl text-glow animate-pulse">TUNING SIGNAL...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20 p-4">
                <div className="text-center">
                  <p className="text-2xl text-red-500 text-glow mb-4">SIGNAL LOST</p>
                  <p className="text-lg text-red-500/80">{error}</p>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              id="player"
              playsInline
              className="w-full h-full"
              onContextMenu={(e) => e.preventDefault()}
            ></video>

            {/* Video Info Panel */}
            <div className={`video-info transition-opacity duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}>
              <div className="video-info-title">{currentVideo}</div>
              <div className="video-info-time">
                {formatTime(currentTime)} / {formatTime(duration)} (-{formatTimeLeft()})
              </div>
              <div className="video-info-next">
                Next: {nextVideo}
              </div>
            </div>

            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen}
              className={`fullscreen-button transition-opacity duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>

            <div
              className={`transition-opacity duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="audio-controls">
                <button onClick={toggleMute} className="audio-button">
                  {isMuted || volume === 0 ? 'MUTE' : 'UNMUTE'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-600 tracking-widest z-10">
          <p>&gt; 24/7 BROADCAST :: SOURCE: PUBLIC DOMAIN ARCHIVES :: 480P STEREO_</p>
        </div>
      </main>
    </div>
  );
}