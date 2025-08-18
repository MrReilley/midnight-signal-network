'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const streamUrl = 'https://midnight-signal-network-production.up.railway.app/stream/live.m3u8';

export default function HomePage() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

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

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden relative">
      {/* CRT Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
        }}></div>
      </div>

      {/* CRT Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="w-full h-full" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.8) 100%)',
        }}></div>
      </div>

      {/* Main Content */}
      <main className="relative z-20 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2" style={{
            textShadow: '0 0 20px #00ff00, 0 0 40px #00ff00',
            fontFamily: 'monospace',
            letterSpacing: '0.2em'
          }}>
            MIDNIGHT SIGNAL
          </h1>
          <p className="text-green-300 text-lg tracking-wider" style={{
            textShadow: '0 0 10px #00ff00'
          }}>
            BROADCASTING FROM THE DIGITAL ETHER
          </p>
        </div>

        {/* TV Frame */}
        <div className="relative w-full max-w-4xl">
          {/* TV Border */}
          <div className="bg-gray-800 border-8 border-gray-700 rounded-lg shadow-2xl relative overflow-hidden">
            {/* TV Screen */}
            <div className="relative bg-black">
              {/* Live Indicator */}
              {isLive && (
                <div className="absolute top-4 right-4 z-30">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 font-bold text-sm tracking-wider">LIVE</span>
                  </div>
                </div>
              )}

              {/* Loading Screen */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
                    <p className="text-green-400 text-lg tracking-wider">TUNING IN...</p>
                    <p className="text-green-600 text-sm mt-2">Establishing connection to broadcast</p>
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
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-black font-bold rounded border-2 border-green-400 transition-colors"
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
                muted 
                playsInline 
                className="w-full h-full"
                style={{
                  filter: 'contrast(1.1) brightness(0.9) saturate(0.8)',
                }}
                // Custom video controls
                controls={false}
                onContextMenu={(e) => e.preventDefault()}
              ></video>

              {/* Custom Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Volume Control */}
                    <button 
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !videoRef.current.muted;
                        }
                      }}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      {videoRef.current?.muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                  <div className="text-green-400 text-sm tracking-wider">
                    MIDNIGHT SIGNAL
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-green-600 text-sm tracking-wider">
          <p>FREQUENCY: 24/7 BROADCAST</p>
          <p>QUALITY: 480P STEREO</p>
          <p>SOURCE: INTERNET ARCHIVE</p>
        </div>

        {/* Static Noise Effect (subtle) */}
        <div className="absolute inset-0 pointer-events-none z-5 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}></div>
        </div>
      </main>
    </div>
  );
}