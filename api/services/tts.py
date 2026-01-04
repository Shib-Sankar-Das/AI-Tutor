"""
Text-to-Speech Service using Edge TTS
Provides high-quality neural voice synthesis without API keys
"""

import edge_tts
import asyncio
from typing import AsyncGenerator


async def generate_speech(
    text: str,
    voice: str = "en-US-AriaNeural",
    rate: str = "+0%"
) -> AsyncGenerator[bytes, None]:
    """
    Generate speech audio from text using Microsoft Edge TTS.
    
    Args:
        text: The text to convert to speech
        voice: The voice to use (default: en-US-AriaNeural)
        rate: Speech rate adjustment (e.g., "+10%", "-20%")
    
    Yields:
        Audio bytes in MP3 format
    """
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]


async def get_available_voices() -> list:
    """
    Get a list of all available TTS voices.
    
    Returns:
        List of voice dictionaries with name, gender, and locale info
    """
    voices = await edge_tts.list_voices()
    return voices


# Common voice presets
VOICE_PRESETS = {
    # English voices
    "en-US-female": "en-US-AriaNeural",
    "en-US-male": "en-US-GuyNeural",
    "en-GB-female": "en-GB-SoniaNeural",
    "en-GB-male": "en-GB-RyanNeural",
    "en-IN-female": "en-IN-NeerjaNeural",
    "en-IN-male": "en-IN-PrabhatNeural",
    
    # Hindi voices
    "hi-IN-female": "hi-IN-SwaraNeural",
    "hi-IN-male": "hi-IN-MadhurNeural",
    
    # Spanish voices
    "es-ES-female": "es-ES-ElviraNeural",
    "es-ES-male": "es-ES-AlvaroNeural",
    
    # French voices
    "fr-FR-female": "fr-FR-DeniseNeural",
    "fr-FR-male": "fr-FR-HenriNeural",
    
    # German voices
    "de-DE-female": "de-DE-KatjaNeural",
    "de-DE-male": "de-DE-ConradNeural",
    
    # Chinese voices
    "zh-CN-female": "zh-CN-XiaoxiaoNeural",
    "zh-CN-male": "zh-CN-YunxiNeural",
    
    # Japanese voices
    "ja-JP-female": "ja-JP-NanamiNeural",
    "ja-JP-male": "ja-JP-KeitaNeural",
}


def get_voice_for_language(language_code: str, gender: str = "female") -> str:
    """
    Get the appropriate voice for a given language code.
    
    Args:
        language_code: ISO language code (e.g., "en", "hi", "es")
        gender: "male" or "female"
    
    Returns:
        Voice name string for Edge TTS
    """
    # Map common language codes to their best voices
    language_map = {
        "en": "en-US",
        "hi": "hi-IN",
        "es": "es-ES",
        "fr": "fr-FR",
        "de": "de-DE",
        "zh": "zh-CN",
        "ja": "ja-JP",
    }
    
    locale = language_map.get(language_code.split("-")[0], "en-US")
    preset_key = f"{locale}-{gender}"
    
    return VOICE_PRESETS.get(preset_key, "en-US-AriaNeural")
