import os
import requests
import sys
import json
import random
from urllib.parse import urljoin

VIDEO_DIR = '/app/content/main_channel'
PLAYLIST_FILE = '/app/content/playlist.txt'
MAX_VIDEOS = 10  # Keep 10 videos in rotation
MAX_DURATION = 30 * 60  # 30 minutes max per video

# Internet Archive search queries for short videos - improved queries
SEARCH_QUERIES = [
    'collection:prelinger',
    'collection:advertising',
    'collection:educational',
    'collection:industrial',
    'collection:training',
    'mediatype:movies AND duration:[0 TO 1800]',
    'mediatype:movies AND collection:movies',
    'mediatype:movies AND collection:television'
]

def fetch_video_list():
    """Fetch a list of potential videos from Internet Archive"""
    print("--- Fetching video list from Internet Archive ---")
    
    videos = []
    for query in SEARCH_QUERIES:
        try:
            print(f"Searching for: {query}")
            # Search for videos with duration under 30 minutes
            search_url = "https://archive.org/advancedsearch.php"
            params = {
                'q': f'{query} AND mediatype:movies AND duration:[0 TO {MAX_DURATION}]',
                'fl[]': 'identifier,title,duration,downloads',
                'sort[]': 'downloads desc',
                'rows': 100,
                'output': 'json'
            }
            
            response = requests.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if 'response' in data and 'docs' in data['response']:
                for doc in data['response']['docs']:
                    if 'identifier' in doc and 'duration' in doc:
                        videos.append({
                            'id': doc['identifier'],
                            'title': doc.get('title', 'Unknown'),
                            'duration': doc['duration']
                        })
                print(f"Found {len(data['response']['docs'])} videos for query '{query}'")
            else:
                print(f"No results found for query '{query}'")
                        
        except Exception as e:
            print(f"Warning: Failed to fetch videos for query '{query}': {e}")
            continue
    
    # Remove duplicates based on identifier
    unique_videos = []
    seen_ids = set()
    for video in videos:
        if video['id'] not in seen_ids:
            unique_videos.append(video)
            seen_ids.add(video['id'])
    
    print(f"Found {len(unique_videos)} unique potential videos")
    return unique_videos

def get_video_download_url(video_id):
    """Get the best MP4 download URL for a video"""
    try:
        # Get video metadata
        metadata_url = f"https://archive.org/metadata/{video_id}"
        response = requests.get(metadata_url, timeout=30)
        response.raise_for_status()
        
        metadata = response.json()
        if 'files' not in metadata:
            return None
            
        # Find the best MP4 file (prefer smaller files for faster streaming)
        mp4_files = []
        for file_info in metadata['files']:
            if file_info['name'].endswith('.mp4') and 'size' in file_info:
                mp4_files.append({
                    'name': file_info['name'],
                    'size': file_info['size'],
                    'url': f"https://{metadata['server']}{metadata['dir']}/{file_info['name']}"
                })
        
        if not mp4_files:
            return None
            
        # Sort by size and pick a medium-sized file (not too big, not too small)
        mp4_files.sort(key=lambda x: x['size'])
        if len(mp4_files) > 3:
            # Pick from the middle range
            selected = mp4_files[len(mp4_files)//2]
        else:
            selected = mp4_files[0]
            
        return selected['url']
        
    except Exception as e:
        print(f"Error getting download URL for {video_id}: {e}")
        return None

def download_video(video_info, index):
    """Download a single video"""
    video_id = video_info['id']
    title = video_info['title']
    
    print(f"Downloading video {index + 1}: {title} ({video_id})")
    
    download_url = get_video_download_url(video_id)
    if not download_url:
        print(f"Could not get download URL for {video_id}")
        return False
    
    filename = f"video_{index + 1:02d}_{video_id}.mp4"
    filepath = os.path.join(VIDEO_DIR, filename)
    
    try:
        response = requests.get(download_url, stream=True, timeout=60)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"  Progress: {percent:.1f}%")
        
        # Verify download
        if os.path.exists(filepath):
            file_size = os.path.getsize(filepath)
            print(f"  ✓ Downloaded successfully ({file_size} bytes)")
            return filename
        else:
            print(f"  ✗ Download failed")
            return False
            
    except Exception as e:
        print(f"  ✗ Download error: {e}")
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
    print("--- Starting Curated Playlist Curator ---")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python executable: {sys.executable}")
    
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
    
    # Fetch new videos
    videos = fetch_video_list()
    if not videos:
        print("No videos found, using fallback video")
        # Fallback to a single test video
        fallback_url = 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4'
        filename = 'fallback_video.mp4'
        filepath = os.path.join(VIDEO_DIR, filename)
        
        try:
            response = requests.get(fallback_url, stream=True, timeout=30)
            response.raise_for_status()
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            create_playlist([filename])
            return
        except Exception as e:
            print(f"Fallback video download failed: {e}")
            sys.exit(1)
    
    # Randomly select videos to download
    selected_videos = random.sample(videos, min(MAX_VIDEOS, len(videos)))
    downloaded_files = []
    
    for i, video in enumerate(selected_videos):
        filename = download_video(video, i)
        if filename:
            downloaded_files.append(filename)
        
        # Stop if we have enough videos
        if len(downloaded_files) >= MAX_VIDEOS:
            break
    
    if not downloaded_files:
        print("No videos were successfully downloaded")
        sys.exit(1)
    
    # Create playlist
    create_playlist(downloaded_files)
    print("--- Curated playlist creation complete ---")

if __name__ == "__main__":
    fetch_curated_playlist()