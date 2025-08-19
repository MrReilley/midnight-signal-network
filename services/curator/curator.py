import os
import requests
import sys
import json
import random
import time
import subprocess

VIDEO_DIR = '/app/content/main_channel'
PLAYLIST_FILE = '/app/content/playlist.txt'
MAX_VIDEOS = 3  # Reduced to 3 videos for faster startup
MAX_DURATION = 5 * 60  # 5 minutes max per video (shorter videos)

def quick_validate_video(input_path):
    """Quick validation without conversion to check if video is usable"""
    try:
        # Quick probe to check if video is valid
        probe_cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json', 
            '-show_format', '-show_streams', input_path
        ]
        
        result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            return False
        
        # Parse the probe output
        try:
            probe_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            return False
        
        # Check if video stream exists and is H.264
        video_streams = [s for s in probe_data.get('streams', []) if s.get('codec_type') == 'video']
        if not video_streams:
            return False
        
        # Check if it's already H.264
        video_stream = video_streams[0]
        if video_stream.get('codec_name') == 'h264':
            return True
        
        return False
        
    except Exception:
        return False

def fast_convert_video(input_path, output_path):
    """Fast video conversion with minimal quality loss"""
    try:
        # Use very fast preset and lower quality for speed
        convert_cmd = [
            'ffmpeg', '-i', input_path,
            '-c:v', 'libx264',      # H.264 codec
            '-c:a', 'aac',          # AAC audio codec
            '-preset', 'ultrafast',  # Fastest encoding
            '-crf', '28',           # Lower quality for speed
            '-maxrate', '500k',     # Limit bitrate
            '-bufsize', '1000k',    # Buffer size
            '-y',                   # Overwrite output
            output_path
        ]
        
        print(f"  Converting video (fast mode)...")
        result = subprocess.run(convert_cmd, capture_output=True, text=True, timeout=120)  # 2 minute timeout
        
        if result.returncode != 0:
            print(f"  ✗ Fast conversion failed, trying copy mode...")
            # Try just copying the streams if conversion fails
            copy_cmd = [
                'ffmpeg', '-i', input_path,
                '-c', 'copy',        # Copy streams without re-encoding
                '-y',               # Overwrite output
                output_path
            ]
            
            result = subprocess.run(copy_cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                return False
        
        return True
        
    except subprocess.TimeoutExpired:
        print(f"  ✗ Video conversion timed out")
        return False
    except Exception as e:
        print(f"  ✗ Video conversion error: {e}")
        return False

def search_internet_archive():
    """Search Internet Archive for short videos"""
    print("Searching Internet Archive for short videos...")
    
    # Focus on collections that are more likely to have short, compatible videos
    search_queries = [
        'mediatype:movies AND collection:prelinger',  # Prelinger collection (short films)
        'mediatype:movies AND collection:opensource_movies',  # Open source movies
        'mediatype:movies AND collection:commercials',  # Commercials (usually short)
        'mediatype:movies AND collection:advertising',  # Advertising (usually short)
    ]
    
    all_videos = []
    
    for query in search_queries:
        try:
            print(f"Searching: {query}")
            
            # Search API endpoint
            search_url = "https://archive.org/advancedsearch.php"
            params = {
                'q': query,
                'output': 'json',
                'rows': 50,  # Reduced to 50 results per query
                'fl': 'identifier,title,duration,downloads,avg_rating',
                'sort': 'downloads desc'  # Sort by popularity
            }
            
            response = requests.get(search_url, params=params, timeout=15)  # Reduced timeout
            response.raise_for_status()
            
            data = response.json()
            
            if 'response' in data and 'docs' in data['response']:
                videos = data['response']['docs']
                print(f"Found {len(videos)} videos for query: {query}")
                
                for video in videos:
                    # Handle duration - convert to int if possible
                    duration_str = video.get('duration', '0')
                    try:
                        duration = int(duration_str) if duration_str else 0
                    except (ValueError, TypeError):
                        duration = 0
                    
                    # Accept videos with no duration info or short duration
                    if duration == 0 or (duration > 0 and duration <= MAX_DURATION):
                        all_videos.append({
                            'identifier': video['identifier'],
                            'title': video.get('title', video['identifier']),
                            'duration': duration,
                            'downloads': video.get('downloads', 0)
                        })
            
            # Shorter delay between requests
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error searching with query '{query}': {e}")
            continue
    
    # Remove duplicates and sort by popularity
    unique_videos = {}
    for video in all_videos:
        if video['identifier'] not in unique_videos:
            unique_videos[video['identifier']] = video
    
    videos_list = list(unique_videos.values())
    videos_list.sort(key=lambda x: x['downloads'], reverse=True)
    
    print(f"Total unique videos found: {len(videos_list)}")
    
    # Debug: Show some of the videos we found
    if videos_list:
        print(f"Sample of found videos:")
        for i, video in enumerate(videos_list[:3]):
            print(f"  {i+1}. {video['title']} (ID: {video['identifier']}, Duration: {video['duration']}s, Downloads: {video['downloads']})")
    
    # Return top videos (most popular)
    return videos_list[:50]  # Return top 50 for variety

def get_video_download_url(video_id):
    """Get the best MP4 download URL for a video"""
    try:
        # Get video metadata
        metadata_url = f"https://archive.org/metadata/{video_id}"
        response = requests.get(metadata_url, timeout=15)  # Reduced timeout
        response.raise_for_status()
        
        metadata = response.json()
        if 'files' not in metadata:
            print(f"No files found for {video_id}")
            return None
            
        # Find MP4 files
        mp4_files = []
        for file_info in metadata['files']:
            if file_info['name'].endswith('.mp4') and 'size' in file_info:
                mp4_files.append({
                    'name': file_info['name'],
                    'size': file_info['size'],
                    'url': f"https://{metadata['server']}{metadata['dir']}/{file_info['name']}"
                })
        
        if not mp4_files:
            print(f"No MP4 files found for {video_id}")
            return None
            
        # Pick the smallest file for fastest download
        mp4_files.sort(key=lambda x: x['size'])
        selected = mp4_files[0]
        print(f"Selected {selected['name']} ({selected['size']} bytes) for {video_id}")
        return selected['url']
        
    except Exception as e:
        print(f"Error getting download URL for {video_id}: {e}")
        return None

def download_video(video_info, index):
    """Download a single video with minimal logging"""
    video_id = video_info['identifier']
    title = video_info['title']
    duration = video_info['duration']
    
    print(f"Downloading video {index + 1}: {title} ({duration}s)")
    
    download_url = get_video_download_url(video_id)
    if not download_url:
        print(f"Could not get download URL for {video_id}")
        return False
    
    # Download to temporary file first
    temp_filename = f"temp_{index + 1:02d}_{video_id}.mp4"
    temp_filepath = os.path.join(VIDEO_DIR, temp_filename)
    
    try:
        response = requests.get(download_url, stream=True, timeout=45)  # Reduced timeout
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        last_log_time = time.time()
        
        with open(temp_filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Only log progress every 10 seconds to reduce log volume
                    current_time = time.time()
                    if current_time - last_log_time > 10:
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"  Progress: {percent:.1f}%")
                        last_log_time = current_time
        
        # Verify download
        if not os.path.exists(temp_filepath):
            print(f"  ✗ Download failed")
            return False
        
        file_size = os.path.getsize(temp_filepath)
        print(f"  ✓ Downloaded successfully ({file_size} bytes)")
        
        # Check if video is already compatible
        if quick_validate_video(temp_filepath):
            print(f"  ✓ Video is already compatible, using as-is")
            final_filename = f"video_{index + 1:02d}_{video_id}.mp4"
            final_filepath = os.path.join(VIDEO_DIR, final_filename)
            os.rename(temp_filepath, final_filepath)
            return final_filename
        
        # Convert to compatible format
        final_filename = f"video_{index + 1:02d}_{video_id}.mp4"
        final_filepath = os.path.join(VIDEO_DIR, final_filename)
        
        if fast_convert_video(temp_filepath, final_filepath):
            # Remove temporary file
            os.remove(temp_filepath)
            return final_filename
        else:
            # Remove failed temporary file
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            return False
            
    except Exception as e:
        print(f"  ✗ Download error: {e}")
        # Clean up temporary file if it exists
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        return False

def create_playlist(video_files):
    """Create a playlist file for FFmpeg"""
    playlist_path = os.path.join(VIDEO_DIR, 'playlist.txt')
    
    with open(playlist_path, 'w') as f:
        for video_file in video_files:
            if video_file:  # Skip failed downloads
                f.write(f"file '{video_file}'\n")
    
    print(f"Created playlist with {len([f for f in video_files if f])} videos")
    return playlist_path

def cleanup_old_videos():
    """Remove old video files to manage storage"""
    if not os.path.exists(VIDEO_DIR):
        return
        
    video_files = [f for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4')]
    if len(video_files) > MAX_VIDEOS:
        # Remove oldest files
        video_files.sort(key=lambda x: os.path.getctime(os.path.join(VIDEO_DIR, x)))
        files_to_remove = video_files[:-MAX_VIDEOS]
        
        for file in files_to_remove:
            filepath = os.path.join(VIDEO_DIR, file)
            try:
                os.remove(filepath)
                print(f"Removed old video: {file}")
            except Exception as e:
                print(f"Failed to remove {file}: {e}")

def fetch_curated_playlist():
    """Main function to fetch and curate a playlist of videos"""
    print("--- Starting Random Video Curator ---")
    print(f"Current working directory: {os.getcwd()}")
    
    # Create content directory
    if not os.path.exists(VIDEO_DIR):
        os.makedirs(VIDEO_DIR, exist_ok=True)
        print(f"Created directory: {VIDEO_DIR}")
    else:
        print(f"Directory already exists: {VIDEO_DIR}")
    
    # Clean up old videos first
    cleanup_old_videos()
    
    # Check if we already have enough videos
    existing_videos = [f for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4')]
    if len(existing_videos) >= MAX_VIDEOS:
        print(f"Already have {len(existing_videos)} videos, skipping download")
        # Create playlist from existing videos
        create_playlist(existing_videos)
        return
    
    # Search for videos on Internet Archive
    available_videos = search_internet_archive()
    
    if not available_videos:
        print("ERROR: No videos found on Internet Archive!")
        sys.exit(1)
    
    # Randomly select videos from the available list
    selected_videos = random.sample(available_videos, min(MAX_VIDEOS, len(available_videos)))
    print(f"Selected {len(selected_videos)} random videos for download:")
    for i, video in enumerate(selected_videos):
        print(f"  {i+1}. {video['title']} ({video['duration']}s)")
    
    downloaded_files = []
    
    for i, video_info in enumerate(selected_videos):
        filename = download_video(video_info, i)
        if filename:
            downloaded_files.append(filename)
        
        # Stop if we have enough videos
        if len(downloaded_files) >= MAX_VIDEOS:
            break
    
    if not downloaded_files:
        print("ERROR: No videos were successfully downloaded!")
        print("This might be due to network issues or unavailable videos.")
        sys.exit(1)
    
    # Create playlist
    create_playlist(downloaded_files)
    print("--- Random video curation complete ---")

if __name__ == "__main__":
    fetch_curated_playlist()