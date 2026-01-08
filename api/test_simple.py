"""
Simple test with the new Google GenAI SDK
"""

import os
os.environ['SSL_CERT_FILE'] = ''  # Clear any SSL issues

from google import genai

# Test API Key 1
print("Testing API Key 1 (Original)...")
try:
    client = genai.Client(api_key="AIzaSyAUh_zdfmfXHYQaxsg3zNeB_W1DX7lmkZU")
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents="Say hello"
    )
    print(f"✅ Key 1 SUCCESS: {response.text}")
except Exception as e:
    print(f"❌ Key 1 ERROR: {str(e)[:200]}")

# Test API Key 2
print("\nTesting API Key 2 (New)...")
try:
    client = genai.Client(api_key="AIzaSyA7lW2hZSFlexIinDxhrDnYUWPR92AlLzQ")
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents="Say hello"
    )
    print(f"✅ Key 2 SUCCESS: {response.text}")
except Exception as e:
    print(f"❌ Key 2 ERROR: {str(e)[:200]}")
