"""
Test API Key Status - Check if keys are blocked (leaked) vs rate limited
Based on Google's documentation: Blocked keys show "API key was reported as leaked"
"""

from google import genai

keys = [
    ('AIzaSyAUh_zdfmfXHYQaxsg3zNeB_W1DX7lmkZU', 'Original'),
    ('AIzaSyA7lW2hZSFlexIinDxhrDnYUWPR92AlLzQ', 'New')
]

print("=" * 60)
print("API KEY STATUS CHECK")
print("=" * 60)

for key, name in keys:
    print(f"\n--- {name} Key ---")
    try:
        client = genai.Client(api_key=key)
        # Try listing models - doesn't count against generation quota
        models = list(client.models.list())
        print(f"✅ Key is VALID - Can list {len(models)} models")
        print("   First 3 models:")
        for m in models[:3]:
            print(f"   - {m.name}")
    except Exception as e:
        err = str(e)
        if 'leaked' in err.lower() or 'blocked' in err.lower():
            print("❌ KEY IS BLOCKED (reported as leaked)")
        elif '429' in err or 'quota' in err.lower():
            print("⚠️  Rate limited but key is VALID")
        else:
            print(f"❌ Error: {err[:200]}")

print("\n" + "=" * 60)
print("ANALYSIS:")
print("- If key can list models: Key is valid, quota exhausted")
print("- If blocked/leaked error: Create new key in Google AI Studio")
print("=" * 60)
