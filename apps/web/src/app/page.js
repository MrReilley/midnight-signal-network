'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const streamUrl = 'https://midnight-signal-network-production.up.railway.app/stream/live.m3u8';

export default function HomePage() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('Attempting to load stream from:', streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setIsLoading(false);
        setIsLive(true);
        video.volume = volume;
        video.muted = isMuted;
        video.play().catch((e) => {
          console.log("Autoplay was blocked by the browser:", e);
          setError("Click to start broadcast");
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          setError(`Signal lost: ${data.details}`);
          setIsLoading(false);
          setIsLive(false);
        }
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached');
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Using native HLS support');
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setIsLive(true);
        video.volume = volume;
        video.muted = isMuted;
        video.play().catch((e) => {
          console.log("Autoplay was blocked by the browser:", e);
          setError("Click to start broadcast");
        });
      });
    } else {
      setError('Broadcast not supported in this browser');
      setIsLoading(false);
    }

    // Test the stream URL directly
    fetch(streamUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(data => {
        console.log('Stream URL is accessible, manifest content:', data.substring(0, 200));
      })
      .catch(err => {
        console.error('Stream URL test failed:', err);
        setError(`Cannot access broadcast: ${err.message}`);
        setIsLoading(false);
      });

  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  return (
    <div className="min-h-screen professional-dark text-gray-100 overflow-hidden">
      {/* Main Content */}
      <main className="relative flex flex-col items-center justify-center min-h-screen p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="heading-primary text-white mb-3">
            Midnight Signal
          </h1>
          <p className="heading-secondary text-gray-300 mb-4">
            Broadcasting from the digital ether
          </p>
          {isLive && (
            <div className="flex items-center justify-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="body-text text-red-400 font-medium">LIVE</span>
              </div>
              <span className="text-gray-500">•</span>
              <span className="body-text text-gray-400">24/7 Broadcast</span>
            </div>
          )}
        </div>

        {/* Video Container */}
        <div className="relative w-full max-w-6xl">
          {/* Video Frame */}
          <div className="glass-panel rounded-2xl p-1 subtle-glow">
            <div 
              className="relative bg-black rounded-xl overflow-hidden aspect-video"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              {/* Live Indicator */}
              {isLive && (
                <div className="absolute top-4 right-4 z-30">
                  <div className="flex items-center space-x-2 bg-black/80 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="body-text text-red-400 font-medium">LIVE</span>
                  </div>
                </div>
              )}

              {/* Loading Screen */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="heading-secondary text-blue-400">Tuning in...</p>
                    <p className="body-text text-gray-500 mt-2">Establishing connection to broadcast</p>
                  </div>
                </div>
              )}

              {/* Error Screen */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-center p-8">
                    <div className="text-red-400 text-4xl mb-4">⚠</div>
                    <p className="heading-secondary text-red-400 mb-4">{error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="professional-button"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}

              {/* Video Player */}
              <video 
                ref={videoRef} 
                id="player" 
                playsInline 
                className="w-full h-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
              ></video>

              {/* Audio Controls */}
              <div 
                className={`audio-controls transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
              >
                <button 
                  onClick={toggleMute}
                  className="audio-button"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
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