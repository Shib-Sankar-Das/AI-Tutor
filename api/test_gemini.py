"""
Simple Gemini API Test
Tests if the API key works and identifies rate limit issues
"""

import os
import sys

# Try to load from .env.local in parent directory
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value
                
import google.generativeai as genai

# Get API key
api_key = os.getenv("GOOGLE_API_KEY")
print(f"API Key configured: {bool(api_key)}")
print(f"API Key (first 10 chars): {api_key[:10] if api_key else 'None'}...")

# Configure the API
genai.configure(api_key=api_key)

# Test multiple models
models_to_test = [
    ("gemini-2.5-pro", "Premium model - 2 RPM, 50 RPD free tier"),
    ("gemini-2.0-flash", "Fast model - 15 RPM, 1500 RPD free tier"),
    ("gemini-1.5-flash", "Legacy flash - may have higher limits"),
]

for model_name, description in models_to_test:
    print(f"\n--- Testing {model_name} ---")
    print(f"({description})")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say 'Hello' in one word only.")
        print(f"✅ SUCCESS: {response.text.strip()}")
    except Exception as e:
        error_str = str(e)
        if "429" in error_str:
            print(f"❌ RATE LIMITED - Daily quota exhausted")
        elif "404" in error_str:
            print(f"❌ MODEL NOT FOUND - This model may not be available")
        else:
            print(f"❌ ERROR: {error_str[:200]}...")

# Configure the API
genai.configure(api_key=api_key)

# Create model
model = genai.GenerativeModel('gemini-2.5-pro')

# Simple test
print("\n--- Testing Gemini 2.5 Pro ---")
try:
    response = model.generate_content("Say 'Hello, the API is working!' in exactly those words.")
    print(f"Response: {response.text}")
    print("\n✅ SUCCESS: API is working correctly!")
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    if "429" in str(e):
        print("\n⚠️ This is a RATE LIMIT error (429)")
        print("The API key is valid, but you've exceeded your quota.")
        print("Check: https://ai.google.dev/gemini-api/docs/rate-limits")
    elif "403" in str(e):
        print("\n⚠️ This is an AUTHENTICATION error (403)")
        print("Check if your API key is valid and has the right permissions.")
    elif "billing" in str(e).lower():
        print("\n⚠️ This is a BILLING error")
        print("You need to enable billing on your Google Cloud project.")
