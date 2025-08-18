import os
import requests
import sys

VIDEO_DIR = '/app/content/main_channel'
# A direct link to a small, reliable test video
VIDEO_URL = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
FILE_NAME = 'initial_video.mp4'

def fetch_debug_video():
    """Downloads a single, hardcoded video for debugging purposes."""
    print("--- Starting DEBUG curator script ---")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python executable: {sys.executable}")
    
    if not os.path.exists(VIDEO_DIR):
        os.makedirs(VIDEO_DIR, exist_ok=True)
        print(f"Created directory: {VIDEO_DIR}")
    else:
        print(f"Directory already exists: {VIDEO_DIR}")
        
    file_path = os.path.join(VIDEO_DIR, FILE_NAME)
    
    print(f"Downloading test video from '{VIDEO_URL}' to '{file_path}'...")
    
    try:
        response = requests.get(VIDEO_URL, stream=True, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"Download progress: {percent:.1f}%")
        
        # Verify the file was downloaded
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print(f"--- DEBUG video downloaded successfully. File size: {file_size} bytes ---")
        else:
            print("ERROR: File was not created after download")
            sys.exit(1)
            
    except requests.exceptions.RequestException as e:
        print(f"FATAL: Network error downloading video. Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"FATAL: Failed to download debug video. Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fetch_debug_video()