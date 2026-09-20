"""
Reel Studio TTS Service.
Converts narration text to audio using Edge-TTS neural voices.
"""

import logging
from pathlib import Path

import edge_tts

logger = logging.getLogger(__name__)

DEFAULT_VOICE = "en-US-AriaNeural"


async def generate_speech(
    text: str,
    output_path: Path,
    voice: str = DEFAULT_VOICE,
) -> Path:
    """
    Generate speech from text using edge-tts.
    Saves MP3 file to output_path.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Generating TTS audio (%d chars) with voice '%s' -> %s", len(text), voice, output_path.name)

    try:
        communicate = edge_tts.Communicate(text=text, voice=voice)
        await communicate.save(str(output_path))

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("Generated audio file is missing or 0 bytes.")

        logger.info("TTS audio successfully generated: %s (%d bytes)", output_path.name, output_path.stat().st_size)
        return output_path
    except Exception as e:
        logger.error("Edge-TTS generation failed: %s", e)
        raise RuntimeError(f"Text-to-speech generation failed: {e}") from e
