'use client'; // This is a client-side component

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

// --- IMPORTANT: REPLACE THIS URL ---
const streamUrl = 'https://midnight-signal-network-production.up.railway.app/stream/live.m3u8';
// --- IMPORTANT: REPLACE THIS URL ---

export default function HomePage() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('Attempting to load stream from:', streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: true,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setIsLoading(false);
        video.play().catch((e) => {
          console.log("Autoplay was blocked by the browser:", e);
          setError("Autoplay blocked - click play to start");
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          setError(`Stream error: ${data.details}`);
          setIsLoading(false);
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
        video.play().catch((e) => {
          console.log("Autoplay was blocked by the browser:", e);
          setError("Autoplay blocked - click play to start");
        });
      });
    } else {
      setError('HLS is not supported in this browser');
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
        setError(`Cannot access stream: ${err.message}`);
        setIsLoading(false);
      });

  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-mono">
      <h1 className="text-5xl font-bold text-cyan-400 mb-4" style={{ textShadow: '0 0 10px #00ffff' }}>
        Midnight Signal
      </h1>
      <p className="text-gray-400 mb-8">Broadcasting from the digital ether...</p>

      <div className="w-full max-w-4xl bg-black border-8 border-gray-700 rounded-lg shadow-2xl shadow-cyan-500/20 relative">
        <div className="absolute top-2 right-4 text-red-500 font-bold text-lg animate-pulse z-10">
          ● LIVE
        </div>
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-400">Loading stream...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
            <div className="text-center p-4">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          id="player" 
          controls 
          muted 
          playsInline 
          className="w-full h-full"
        ></video>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Stream URL: {streamUrl}</p>
        <p>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Playing'}</p>
      </div>
    </main>
  );
}