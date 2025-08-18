import internetarchive
import os
import requests
import random

# The directory where videos will be saved
VIDEO_DIR = '/app/content/main_channel'
# Maximum desired video length in seconds (30 minutes * 60 seconds)
MAX_LENGTH_SECONDS = 1800

def fetch_random_video():
    """
    Searches the Prelinger Archives for a random video under 30 minutes,
    downloads it, and prepares it for streaming.
    """

    # --- Step 1: Clean up old videos before starting ---
    if os.path.exists(VIDEO_DIR):
        print("Cleaning up old video files...")
        for filename in os.listdir(VIDEO_DIR):
            file_path = os.path.join(VIDEO_DIR, filename)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")
    else:
        os.makedirs(VIDEO_DIR)
        
    print("--- Searching for a random video from the Prelinger Archives (under 30 mins) ---")
    
    # Define a robust search query for high-quality, downloadable content
    search_query = 'collection:prelinger AND mediatype:movies'
    
    try:
        # Get a list of items that match our query. Fetch more to increase chances of finding one.
        search_results = list(internetarchive.search_items(search_query, params={'rows': 500}))
        
        if not search_results:
            print("Search returned no results. Cannot find a video.")
            return

        # Shuffle the list to ensure we don't always check the same items first
        random.shuffle(search_results)

        # Loop through our random list until we find a usable video
        for item_summary in search_results:
            item_id = item_summary['identifier']
            
            # Get the full details for the selected item
            item_details = internetarchive.get_item(item_id)
            
            # --- Step 2: Find a suitable video file ---
            video_files = [f for f in item_details.files if f['name'].endswith(('.mp4', '.ogv'))]
            
            if video_files:
                # Prefer MP4 if available, otherwise take the first video found.
                file_to_check = next((f for f in video_files if f['name'].endswith('.mp4')), video_files[0])
                
                # --- Step 3: Check the video's duration ---
                # The 'length' is in the file's metadata, formatted as HH:MM:SS or MM:SS
                duration_str = file_to_check.get('length')
                if duration_str:
                    parts = list(map(float, duration_str.split(':')))
                    if len(parts) == 3:  # HH:MM:SS
                        duration_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                    elif len(parts) == 2:  # MM:SS
                        duration_seconds = parts[0] * 60 + parts[1]
                    else:
                        duration_seconds = 0
                    
                    print(f"Checking item: {item_id} (Length: {duration_str})")
                    
                    if 0 < duration_seconds <= MAX_LENGTH_SECONDS:
                        # --- Step 4: We found a perfect video! Download it. ---
                        download_url = f"https://{item_details.server}{item_details.dir}/{file_to_check['name']}"
                        file_path = os.path.join(VIDEO_DIR, file_to_check['name'])
                        
                        print(f"Found suitable video! Downloading '{file_to_check['name']}'...")
                        
                        with requests.get(download_url, stream=True) as r:
                            r.raise_for_status()
                            with open(file_path, 'wb') as f:
                                for chunk in r.iter_content(chunk_size=8192):
                                    f.write(chunk)
                                    
                        print(f"--- Video downloaded successfully to {file_path} ---")
                        
                        # IMPORTANT: Exit the function now that we have our video
                        return

        # If the loop finishes, we didn't find any videos in our random sample that fit the criteria
        print("--- Could not find a downloadable video under 30 minutes in the random sample. ---")

    except Exception as e:
        print(f"An error occurred while fetching a random video: {e}")

if __name__ == "__main__":
    fetch_random_video()