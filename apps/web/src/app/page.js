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

    // Update video info periodically
    const updateVideoInfo = () => {
      // Much more diverse video categories for variety
      const videos = [
        // Educational and Documentary
        'Educational Film (Various)',
        'Documentary (Nature)',
        'News Broadcast (Archive)',
        'Television Show (Classic)',
        
        // Animation and Creative
        'Animated Short (Experimental)',
        'Cartoon (Vintage)',
        'Art Film (Avant-garde)',
        'Creative Animation',
        
        // Music and Performance
        'Live Concert (Archive)',
        'Music Video (Classic)',
        'Performance Art',
        'Live Music Session',
        
        // Sports and Action
        'Sports Highlights (Archive)',
        'Action Sequence',
        'Adventure Documentary',
        
        // Sci-Fi and Fantasy
        'Science Fiction Short',
        'Fantasy Film (Classic)',
        'Horror B-Movie',
        
        // Comedy and Entertainment
        'Comedy Sketch (Vintage)',
        'Variety Show (Archive)',
        'Game Show (Classic)',
        
        // Technology and Science
        'Technology Documentary',
        'Science Film (Educational)',
        'Space Exploration (Archive)',
        
        // Travel and Nature
        'Travel Documentary',
        'Nature Film (Wildlife)',
        'Environmental Film',
        
        // Historical and Cultural
        'Historical Documentary',
        'Cultural Film (International)',
        'Ethnic Documentary',
        
        // Weird and Experimental
        'Experimental Film',
        'Underground Cinema',
        'Cult Classic',
        
        // International Content
        'Foreign Film (Classic)',
        'World Cinema (Archive)',
        'International Documentary',
        
        // Public Domain Classics
        'Public Domain Film',
        'Classic Commercial',
        'Vintage Advertisement',
        'Archive Footage',
        'Historical Broadcast',
        'Classic Television',
        'Retro Animation',
        'Vintage Documentary'
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

  return (
    <div className="min-h-screen bg-black text-white" onClick={handleUserInteraction}>
      <main className="relative flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center mb-8 z-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Midnight Signal
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide">
            Broadcasting from the digital ether
          </p>
          {isLive && (
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
            </div>
          )}
        </div>

        {/* Video Container */}
        <div className="relative w-full max-w-4xl" ref={videoContainerRef}>
          <div
            className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-blue-400 text-sm font-medium">Tuning in...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center">
                  <div className="text-red-400 text-3xl mb-4">⚠</div>
                  <p className="text-red-400 text-sm font-medium mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
            <div className={`absolute top-4 left-4 z-50 bg-black/80 backdrop-blur-sm border border-gray-800 p-3 rounded-md max-w-xs transition-opacity duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-white text-sm font-medium mb-1">{currentVideo}</div>
              <div className="text-gray-400 text-xs pt-1 border-t border-gray-700">
                Next: {nextVideo}
              </div>
            </div>

            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen}
              className={`absolute top-4 right-4 z-50 bg-black/80 backdrop-blur-sm border border-gray-800 text-gray-300 hover:text-white p-2 rounded-md transition-all duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>

            {/* Audio Controls */}
            <div className={`absolute bottom-4 left-4 z-50 transition-opacity duration-300 ${showControls || !isLive ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-3 bg-black/80 backdrop-blur-sm border border-gray-800 p-3 rounded-md">
                <button onClick={toggleMute} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
                  {isMuted || volume === 0 ? 'MUTE' : 'UNMUTE'}
                </button>
                <div className="flex items-center gap-2">
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
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 font-mono">
            <span>FREQUENCY: 24/7 BROADCAST</span>
            <span>•</span>
            <span>QUALITY: 480P STEREO</span>
            <span>•</span>
            <span>CONTENT: DIVERSE ARCHIVE</span>
          </div>
        </div>
      </main>
    </div>
  );
}