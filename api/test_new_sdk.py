"""
Test with the new Google GenAI SDK (google-genai)
Tests both API keys with gemini-2.5-pro
"""

from google import genai

# Both API keys to test
API_KEYS = [
    ("AIzaSyAUh_zdfmfXHYQaxsg3zNeB_W1DX7lmkZU", "Original API Key"),
    ("AIzaSyA7lW2hZSFlexIinDxhrDnYUWPR92AlLzQ", "New API Key"),
]

def test_api_key(api_key: str, key_name: str):
    """Test an API key with the new SDK"""
    print(f"\n{'='*50}")
    print(f"Testing: {key_name}")
    print(f"Key: {api_key[:15]}...")
    print("="*50)
    
    try:
        # Create client with explicit API key
        client = genai.Client(api_key=api_key)
        
        # Test with gemini-2.5-pro
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents="Say 'Hello, the API is working!' in exactly those words."
        )
        print(f"✅ SUCCESS: {response.text}")
        return True
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ ERROR: {error_str[:300]}")
        
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            print("\n⚠️  This is a RATE LIMIT error - quota exhausted")
        elif "403" in error_str:
            print("\n⚠️  This is an AUTH error - check API key permissions")
        elif "404" in error_str:
            print("\n⚠️  Model not found - try a different model")
            
        return False


if __name__ == "__main__":
    print("Testing Google GenAI SDK (google-genai)")
    print("Model: gemini-2.5-pro")
    
    results = []
    for api_key, key_name in API_KEYS:
        success = test_api_key(api_key, key_name)
        results.append((key_name, success))
    
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    for key_name, success in results:
        status = "✅ Working" if success else "❌ Failed"
        print(f"{key_name}: {status}")
