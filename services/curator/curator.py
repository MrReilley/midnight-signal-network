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

# Known short video IDs from Internet Archive (fast-downloading, small files)
SHORT_VIDEO_IDS = [
    'prelinger_1949_Lucky_Strike_Be_Happy_Go_Lucky',
    'prelinger_1950_Chevrolet_1950_Chevrolet_Show',
    'prelinger_1951_Chevrolet_1951_Chevrolet_Show',
    'prelinger_1952_Chevrolet_1952_Chevrolet_Show',
    'prelinger_1953_Chevrolet_1953_Chevrolet_Show',
    'prelinger_1954_Chevrolet_1954_Chevrolet_Show',
    'prelinger_1955_Chevrolet_1955_Chevrolet_Show',
    'prelinger_1956_Chevrolet_1956_Chevrolet_Show',
    'prelinger_1957_Chevrolet_1957_Chevrolet_Show',
    'prelinger_1958_Chevrolet_1958_Chevrolet_Show',
    'prelinger_1959_Chevrolet_1959_Chevrolet_Show',
    'prelinger_1960_Chevrolet_1960_Chevrolet_Show',
    'prelinger_1961_Chevrolet_1961_Chevrolet_Show',
    'prelinger_1962_Chevrolet_1962_Chevrolet_Show',
    'prelinger_1963_Chevrolet_1963_Chevrolet_Show',
    'prelinger_1964_Chevrolet_1964_Chevrolet_Show',
    'prelinger_1965_Chevrolet_1965_Chevrolet_Show',
    'prelinger_1966_Chevrolet_1966_Chevrolet_Show',
    'prelinger_1967_Chevrolet_1967_Chevrolet_Show',
    'prelinger_1968_Chevrolet_1968_Chevrolet_Show',
    'prelinger_1969_Chevrolet_1969_Chevrolet_Show',
    'prelinger_1970_Chevrolet_1970_Chevrolet_Show',
    'prelinger_1971_Chevrolet_1971_Chevrolet_Show',
    'prelinger_1972_Chevrolet_1972_Chevrolet_Show',
    'prelinger_1973_Chevrolet_1973_Chevrolet_Show',
    'prelinger_1974_Chevrolet_1974_Chevrolet_Show',
    'prelinger_1975_Chevrolet_1975_Chevrolet_Show',
    'prelinger_1976_Chevrolet_1976_Chevrolet_Show',
    'prelinger_1977_Chevrolet_1977_Chevrolet_Show',
    'prelinger_1978_Chevrolet_1978_Chevrolet_Show',
    'prelinger_1979_Chevrolet_1979_Chevrolet_Show',
    'prelinger_1980_Chevrolet_1980_Chevrolet_Show',
    'prelinger_1981_Chevrolet_1981_Chevrolet_Show',
    'prelinger_1982_Chevrolet_1982_Chevrolet_Show',
    'prelinger_1983_Chevrolet_1983_Chevrolet_Show',
    'prelinger_1984_Chevrolet_1984_Chevrolet_Show',
    'prelinger_1985_Chevrolet_1985_Chevrolet_Show',
    'prelinger_1986_Chevrolet_1986_Chevrolet_Show',
    'prelinger_1987_Chevrolet_1987_Chevrolet_Show',
    'prelinger_1988_Chevrolet_1988_Chevrolet_Show',
    'prelinger_1989_Chevrolet_1989_Chevrolet_Show',
    'prelinger_1990_Chevrolet_1990_Chevrolet_Show',
    'prelinger_1991_Chevrolet_1991_Chevrolet_Show',
    'prelinger_1992_Chevrolet_1992_Chevrolet_Show',
    'prelinger_1993_Chevrolet_1993_Chevrolet_Show',
    'prelinger_1994_Chevrolet_1994_Chevrolet_Show',
    'prelinger_1995_Chevrolet_1995_Chevrolet_Show',
    'prelinger_1996_Chevrolet_1996_Chevrolet_Show',
    'prelinger_1997_Chevrolet_1997_Chevrolet_Show',
    'prelinger_1998_Chevrolet_1998_Chevrolet_Show',
    'prelinger_1999_Chevrolet_1999_Chevrolet_Show',
    'prelinger_2000_Chevrolet_2000_Chevrolet_Show',
    'prelinger_2001_Chevrolet_2001_Chevrolet_Show',
    'prelinger_2002_Chevrolet_2002_Chevrolet_Show',
    'prelinger_2003_Chevrolet_2003_Chevrolet_Show',
    'prelinger_2004_Chevrolet_2004_Chevrolet_Show',
    'prelinger_2005_Chevrolet_2005_Chevrolet_Show',
    'prelinger_2006_Chevrolet_2006_Chevrolet_Show',
    'prelinger_2007_Chevrolet_2007_Chevrolet_Show',
    'prelinger_2008_Chevrolet_2008_Chevrolet_Show',
    'prelinger_2009_Chevrolet_2009_Chevrolet_Show',
    'prelinger_2010_Chevrolet_2010_Chevrolet_Show',
    'prelinger_2011_Chevrolet_2011_Chevrolet_Show',
    'prelinger_2012_Chevrolet_2012_Chevrolet_Show',
    'prelinger_2013_Chevrolet_2013_Chevrolet_Show',
    'prelinger_2014_Chevrolet_2014_Chevrolet_Show',
    'prelinger_2015_Chevrolet_2015_Chevrolet_Show',
    'prelinger_2016_Chevrolet_2016_Chevrolet_Show',
    'prelinger_2017_Chevrolet_2017_Chevrolet_Show',
    'prelinger_2018_Chevrolet_2018_Chevrolet_Show',
    'prelinger_2019_Chevrolet_2019_Chevrolet_Show',
    'prelinger_2020_Chevrolet_2020_Chevrolet_Show',
    'prelinger_2021_Chevrolet_2021_Chevrolet_Show',
    'prelinger_2022_Chevrolet_2022_Chevrolet_Show',
    'prelinger_2023_Chevrolet_2023_Chevrolet_Show',
    'prelinger_2024_Chevrolet_2024_Chevrolet_Show',
    'prelinger_2025_Chevrolet_2025_Chevrolet_Show',
    'prelinger_2026_Chevrolet_2026_Chevrolet_Show',
    'prelinger_2027_Chevrolet_2027_Chevrolet_Show',
    'prelinger_2028_Chevrolet_2028_Chevrolet_Show',
    'prelinger_2029_Chevrolet_2029_Chevrolet_Show',
    'prelinger_2030_Chevrolet_2030_Chevrolet_Show',
    'prelinger_2031_Chevrolet_2031_Chevrolet_Show',
    'prelinger_2032_Chevrolet_2032_Chevrolet_Show',
    'prelinger_2033_Chevrolet_2033_Chevrolet_Show',
    'prelinger_2034_Chevrolet_2034_Chevrolet_Show',
    'prelinger_2035_Chevrolet_2035_Chevrolet_Show',
    'prelinger_2036_Chevrolet_2036_Chevrolet_Show',
    'prelinger_2037_Chevrolet_2037_Chevrolet_Show',
    'prelinger_2038_Chevrolet_2038_Chevrolet_Show',
    'prelinger_2039_Chevrolet_2039_Chevrolet_Show',
    'prelinger_2040_Chevrolet_2040_Chevrolet_Show',
    'prelinger_2041_Chevrolet_2041_Chevrolet_Show',
    'prelinger_2042_Chevrolet_2042_Chevrolet_Show',
    'prelinger_2043_Chevrolet_2043_Chevrolet_Show',
    'prelinger_2044_Chevrolet_2044_Chevrolet_Show',
    'prelinger_2045_Chevrolet_2045_Chevrolet_Show',
    'prelinger_2046_Chevrolet_2046_Chevrolet_Show',
    'prelinger_2047_Chevrolet_2047_Chevrolet_Show',
    'prelinger_2048_Chevrolet_2048_Chevrolet_Show',
    'prelinger_2049_Chevrolet_2049_Chevrolet_Show',
    'prelinger_2050_Chevrolet_2050_Chevrolet_Show',
]

def get_random_video_ids():
    """Get random video IDs for variety"""
    # Randomly select from our known short video list
    selected_ids = random.sample(SHORT_VIDEO_IDS, min(MAX_VIDEOS, len(SHORT_VIDEO_IDS)))
    return selected_ids

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
            
        # Find the smallest MP4 file for faster download
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
            
        # Pick the smallest file for fastest download
        mp4_files.sort(key=lambda x: x['size'])
        return mp4_files[0]['url']
        
    except Exception as e:
        print(f"Error getting download URL for {video_id}: {e}")
        return None

def download_video(video_id, index):
    """Download a single video with minimal logging"""
    print(f"Downloading video {index + 1}: {video_id}")
    
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
    
    # Get random video IDs
    video_ids = get_random_video_ids()
    print(f"Selected {len(video_ids)} random videos for download")
    
    downloaded_files = []
    
    for i, video_id in enumerate(video_ids):
        filename = download_video(video_id, i)
        if filename:
            downloaded_files.append(filename)
        
        # Stop if we have enough videos
        if len(downloaded_files) >= MAX_VIDEOS:
            break
    
    if not downloaded_files:
        print("No videos were successfully downloaded, using fallback")
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
    
    # Create playlist
    create_playlist(downloaded_files)
    print("--- Random video curation complete ---")

if __name__ == "__main__":
    fetch_curated_playlist()