import os
import requests

VIDEO_DIR = '/app/content/main_channel'
# A direct link to a short, reliable public domain video file
VIDEO_URL = 'https://archive.org/download/prelinger_1949_Lucky_Strike_Be_Happy_Go_Lucky/prelinger_1949_Lucky_Strike_Be_Happy_Go_Lucky_512kb.mp4'
FILE_NAME = 'initial_video.mp4'

def fetch_debug_video():
    """Downloads a single, hardcoded video for debugging purposes."""
    print("--- Starting DEBUG curator script ---")
    if not os.path.exists(VIDEO_DIR):
        os.makedirs(VIDEO_DIR)
        print(f"Created directory: {VIDEO_DIR}")
        
    file_path = os.path.join(VIDEO_DIR, FILE_NAME)
    
    print(f"Downloading test video from '{VIDEO_URL}' to '{file_path}'...")
    
    try:
        with requests.get(VIDEO_URL, stream=True) as r:
            r.raise_for_status()
            with open(file_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8128):
                    f.write(chunk)
        print(f"--- DEBUG video downloaded successfully. ---")
    except Exception as e:
        print(f"FATAL: Failed to download debug video. Error: {e}")
        # Exit with a non-zero code to indicate failure
        exit(1)

if __name__ == "__main__":
    fetch_debug_video()