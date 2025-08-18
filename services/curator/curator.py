import internetarchive
import os
import requests

# The directory where videos will be saved, relative to the streamer's root
VIDEO_DIR = '/app/content/main_channel'

def fetch_initial_video():
    if not os.path.exists(VIDEO_DIR):
        os.makedirs(VIDEO_DIR)
        
    print("--- Fetching initial video for MVP stream ---")
    try:
        # A known, reliable, short infomercial to start with
        item_id = 'infomercial-popeil-pocket-fisherman'
        item_details = internetarchive.get_item(item_id)
        mp4_files = [f for f in item_details.files if f['name'].endswith('.mp4')]
        
        if not mp4_files:
            print("Could not find MP4 file for initial video.")
            return

        file_to_download = mp4_files[0]
        download_url = f"https://{item_details.server}{item_details.dir}/{file_to_download['name']}"
        file_path = os.path.join(VIDEO_DIR, file_to_download['name'])
        
        print(f"Downloading '{file_to_download['name']}'...")
        with requests.get(download_url, stream=True) as r:
            r.raise_for_status()
            with open(file_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print("--- Initial video downloaded successfully ---")
    except Exception as e:
        print(f"An error occurred fetching initial video: {e}")

if __name__ == "__main__":
    fetch_initial_video()