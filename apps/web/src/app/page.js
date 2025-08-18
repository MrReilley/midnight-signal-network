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
    <div className="min-h-screen dark-purple-bg text-purple-200 font-mono overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        }}></div>
      </div>

      {/* CRT Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(147, 51, 234, 0.03) 2px, rgba(147, 51, 234, 0.03) 4px)',
        }}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none z-5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-30 float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main Content */}
      <main className="relative z-20 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-bold mb-4 futuristic-text neon-glow pulse">
            MIDNIGHT SIGNAL
          </h1>
          <p className="text-purple-300 text-xl tracking-wider neon-glow">
            BROADCASTING FROM THE DIGITAL ETHER
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold text-sm tracking-wider">LIVE</span>
            </div>
            <span className="text-purple-400 text-sm">•</span>
            <span className="text-purple-400 text-sm">24/7 BROADCAST</span>
          </div>
        </div>

        {/* TV Frame */}
        <div className="relative w-full max-w-5xl">
          {/* TV Border with Glass Effect */}
          <div className="glass-effect rounded-2xl p-2 neon-border">
            <div className="relative bg-black rounded-xl overflow-hidden">
              {/* Live Indicator */}
              {isLive && (
                <div className="absolute top-4 right-4 z-30">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-bold text-sm tracking-wider">LIVE</span>
                  </div>
                </div>
              )}

              {/* Loading Screen */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
                    <p className="text-purple-400 text-lg tracking-wider neon-glow">TUNING IN...</p>
                    <p className="text-purple-600 text-sm mt-2">Establishing connection to broadcast</p>
                  </div>
                </div>
              )}

              {/* Error Screen */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-center p-8">
                    <div className="text-red-400 text-4xl mb-4">⚠</div>
                    <p className="text-red-400 mb-4 text-lg">{error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="retro-button"
                    >
                      RETRY CONNECTION
                    </button>
                  </div>
                </div>
              )}

              {/* Video Player */}
              <video 
                ref={videoRef} 
                id="player" 
                playsInline 
                className="w-full h-full"
                style={{
                  filter: 'contrast(1.1) brightness(0.9) saturate(0.8)',
                }}
                onContextMenu={(e) => e.preventDefault()}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
              ></video>

              {/* Audio Controls */}
              <div className={`audio-controls transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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
        <div className="mt-8 text-center text-purple-500 text-sm tracking-wider">
          <div className="flex items-center justify-center space-x-6">
            <p>FREQUENCY: 24/7 BROADCAST</p>
            <span>•</span>
            <p>QUALITY: 480P STEREO</p>
            <span>•</span>
            <p>SOURCE: INTERNET ARCHIVE</p>
          </div>
        </div>

        {/* Scanline Effect */}
        <div className="scanline"></div>
      </main>
    </div>
  );
}