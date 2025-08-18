'use client'; // This is a client-side component

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

// --- IMPORTANT: REPLACE THIS URL ---
const streamUrl = 'https://midnight-signal-network-production.up.railway.app';
// --- IMPORTANT: REPLACE THIS URL ---

export default function HomePage() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => console.log("Autoplay was blocked by the browser."));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }
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
        <video ref={videoRef} id="player" controls muted playsInline className="w-full h-full"></video>
      </div>
    </main>
  );
}