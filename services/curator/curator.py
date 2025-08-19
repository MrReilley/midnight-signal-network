import os
import requests
import sys
import json
import random
import time

VIDEO_DIR = '/app/content/main_channel'
PLAYLIST_FILE = '/app/content/playlist.txt'
MAX_VIDEOS = 5  # Reduced to 5 videos for faster startup
MAX_DURATION = 10 * 60  # 10 minutes max per video (shorter videos)

def search_internet_archive():
    """Search Internet Archive for short videos"""
    print("Searching Internet Archive for short videos...")
    
    # Search queries that should return short videos
    search_queries = [
        'mediatype:movies AND duration:[* TO 600]',  # Under 10 minutes
        'mediatype:movies AND duration:[* TO 300]',  # Under 5 minutes
        'mediatype:movies AND collection:prelinger',  # Prelinger collection
        'mediatype:movies AND collection:opensource_movies',  # Open source movies
        'mediatype:movies AND collection:feature_films',  # Feature films
        'mediatype:movies AND collection:animation',  # Animation
        'mediatype:movies AND collection:educational',  # Educational
        'mediatype:movies AND collection:commercials',  # Commercials
        'mediatype:movies AND collection:advertising',  # Advertising
        'mediatype:movies AND collection:industrial',  # Industrial films
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
                'rows': 50,  # Get 50 results per query
                'fl': 'identifier,title,duration,downloads,avg_rating',
                'sort': 'downloads desc'  # Sort by popularity
            }
            
            response = requests.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'response' in data and 'docs' in data['response']:
                videos = data['response']['docs']
                print(f"Found {len(videos)} videos for query: {query}")
                
                for video in videos:
                    # Only include videos with reasonable duration
                    duration = video.get('duration', 0)
                    if duration and duration <= MAX_DURATION:
                        all_videos.append({
                            'identifier': video['identifier'],
                            'title': video.get('title', video['identifier']),
                            'duration': duration,
                            'downloads': video.get('downloads', 0)
                        })
            
            # Small delay between requests
            time.sleep(1)
            
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
    
    # Return top videos (most popular)
    return videos_list[:100]  # Return top 100 for variety

def get_video_download_url(video_id):
    """Get the best MP4 download URL for a video"""
    try:
        # Get video metadata
        metadata_url = f"https://archive.org/metadata/{video_id}"
        response = requests.get(metadata_url, timeout=30)
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
    
    filename = f"video_{index + 1:02d}_{video_id}.mp4"
    filepath = os.path.join(VIDEO_DIR, filename)
    
    try:
        response = requests.get(download_url, stream=True, timeout=60)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        last_log_time = time.time()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Only log progress every 5 seconds to avoid rate limits
                    current_time = time.time()
                    if current_time - last_log_time > 5:
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"  Progress: {percent:.1f}%")
                        last_log_time = current_time
        
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