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
  const [currentVideo, setCurrentVideo] = useState('Midnight Signal');
  const [nextVideo, setNextVideo] = useState('Random Archive Content');

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

    // Update video info periodically
    const updateVideoInfo = () => {
      // Simulate video changes every 5-10 minutes for a live stream feel
      const videos = [
        'Classic Commercial (1950s)',
        'Educational Film (1960s)',
        'Industrial Documentary (1970s)',
        'Public Service Announcement (1980s)',
        'Retro Advertisement (1990s)',
        'Archive Footage (Various)',
        'Historical Documentary',
        'Vintage Animation',
        'Classic Television',
        'Public Domain Film'
      ];
      
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      const randomNext = videos[Math.floor(Math.random() * videos.length)];
      
      setCurrentVideo(randomVideo);
      setNextVideo(randomNext);
    };

    // Update video info every 5 minutes
    const videoInfoInterval = setInterval(updateVideoInfo, 5 * 60 * 1000);
    updateVideoInfo(); // Initial update

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

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support
      video.src = streamUrl;
      // ... (add native support logic here if needed)
    }

    // --- Cleanup ---
    return () => {
      video.removeEventListener('seeking', preventSeek);
      video.removeEventListener('timeupdate', updateTime);
      clearInterval(videoInfoInterval);
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
    <div className="min-h-screen dark-theme text-gray-100" onClick={handleUserInteraction}>
      <main className="relative flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center mb-8 z-10">
          <h1 className="heading-primary text-white mb-3">
            Midnight Signal
          </h1>
          <p className="heading-secondary text-gray-400">
            Broadcasting from the digital ether
          </p>
          {isLive && (
            <div className="flex items-center justify-center space-x-3 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="body-text text-red-400 font-medium">LIVE</span>
              </div>
              <span className="text-gray-600">•</span>
              <span className="body-text text-gray-500">24/7 Broadcast</span>
            </div>
          )}
        </div>

        <div className="relative w-full video-container" ref={videoContainerRef}>
          <div
            className="relative bg-black aspect-video rounded-xl overflow-hidden"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {isLoading && (
              <div className="loading-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="heading-secondary text-blue-400">Tuning in...</p>
                  <p className="body-text text-gray-500 mt-2">Establishing connection to broadcast</p>
                </div>
              </div>
            )}

            {error && (
              <div className="error-screen">
                <div className="text-center">
                  <div className="text-red-400 text-4xl mb-4">⚠</div>
                  <p className="heading-secondary text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
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
        
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6">
            <p className="mono-text text-gray-500">FREQUENCY: 24/7 BROADCAST</p>
            <span className="text-gray-600">•</span>
            <p className="mono-text text-gray-500">QUALITY: 480P STEREO</p>
            <span className="text-gray-600">•</span>
            <p className="mono-text text-gray-500">SOURCE: INTERNET ARCHIVE</p>
          </div>
        </div>
      </main>
    </div>
  );
}