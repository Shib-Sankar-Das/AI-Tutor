"""
Test Hugging Face Inference API with Gemma-3-27b-it
100% FREE with a Hugging Face account!

To get your free token:
1. Go to https://huggingface.co/settings/tokens
2. Create a new token (Read access is enough)
3. Set it as HF_TOKEN environment variable
"""

import httpx
import os

# Replace with your Hugging Face token
HF_TOKEN = os.getenv("HF_TOKEN") or "YOUR_HF_TOKEN_HERE"

# Hugging Face Inference API endpoint
API_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions"
MODEL = "google/gemma-3-27b-it"

def test_huggingface():
    print("=" * 60)
    print("Testing Hugging Face Inference API")
    print(f"Model: {MODEL}")
    print("=" * 60)
    
    if HF_TOKEN == "YOUR_HF_TOKEN_HERE":
        print("\n❌ Please set your HF_TOKEN!")
        print("\nTo get a free token:")
        print("1. Go to https://huggingface.co/settings/tokens")
        print("2. Create a new token (Read access is enough)")
        print("3. Run: set HF_TOKEN=your_token_here")
        return
    
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful AI tutor."},
            {"role": "user", "content": "What is 2 + 2? Answer in one sentence."}
        ],
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    print("\n🔄 Sending request...")
    
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(API_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                answer = result["choices"][0]["message"]["content"]
                print(f"\n✅ SUCCESS!")
                print(f"\nResponse: {answer}")
                print(f"\nUsage: {result.get('usage', 'N/A')}")
            else:
                print(f"\n❌ Error {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_huggingface()
