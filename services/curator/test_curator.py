#!/usr/bin/env python3
"""
Simple test script to verify the curator environment
"""
import os
import sys
import requests

def test_environment():
    print("=== Environment Test ===")
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python executable: {sys.executable}")
    
    # Test if we can import required modules
    try:
        import requests
        print("✓ requests module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import requests: {e}")
        return False
    
    # Test if we can make a simple HTTP request
    try:
        response = requests.get('https://httpbin.org/get', timeout=10)
        print(f"✓ HTTP request test successful: {response.status_code}")
    except Exception as e:
        print(f"✗ HTTP request test failed: {e}")
        return False
    
    # Test if we can create directories
    try:
        test_dir = '/tmp/test_curator'
        os.makedirs(test_dir, exist_ok=True)
        print(f"✓ Directory creation test successful: {test_dir}")
        os.rmdir(test_dir)
    except Exception as e:
        print(f"✗ Directory creation test failed: {e}")
        return False
    
    print("=== Environment Test Complete ===")
    return True

if __name__ == "__main__":
    success = test_environment()
    sys.exit(0 if success else 1)
