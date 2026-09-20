"""
Text-to-Speech service using edge-tts (Microsoft Edge neural voices).

Completely free — no API key or billing required.
Converts voiceover text into an MP3 audio file asynchronously.
This module has no FastAPI imports — it is pure service logic.
"""

import logging
from pathlib import Path

import edge_tts

logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

AUDIO_FILENAME: str = "audio.mp3"
DEFAULT_VOICE: str = "Microsoft Server Speech Text to Speech Voice (en-US, AriaNeural)"

# Other excellent free voices available:
# "Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)"      — male, American
# "Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)"    — female, American
# "Microsoft Server Speech Text to Speech Voice (en-GB, SoniaNeural)"    — female, British
# "Microsoft Server Speech Text to Speech Voice (en-IN, NeerjaNeural)"   — female, Indian English


# ============================================================================
# TEXT-TO-SPEECH
# ============================================================================


async def generate_audio(
    text: str,
    output_dir: Path,
    voice: str = DEFAULT_VOICE,
) -> Path:
    """
    Convert text to speech and save as MP3 using Microsoft Edge
    neural voices via edge-tts. Completely free, no API key needed.

    Args:
        text: The narration script to convert to speech.
        output_dir: Directory where audio.mp3 will be saved.
        voice: Edge TTS voice name. Defaults to en-US-AriaNeural.

    Returns:
        Path to the saved audio.mp3 file.

    Raises:
        RuntimeError: If the TTS conversion fails for any reason.
    """
    audio_path = output_dir / AUDIO_FILENAME

    logger.info("[TTS] Generating audio — %d chars → %s", len(text), audio_path)

    try:
        # Create TTS communicator and save audio
        communicate = edge_tts.Communicate(text=text, voice=voice)
        await communicate.save(str(audio_path))

        # Verify file was created and has content
        if not audio_path.exists():
            raise RuntimeError(f"Audio file was not created at {audio_path}")

        file_size = audio_path.stat().st_size
        if file_size == 0:
            raise RuntimeError(f"Generated audio file is empty (0 bytes)")

        logger.info("[TTS] Audio saved — %s (%d bytes)", audio_path, file_size)
        return audio_path

    except RuntimeError:
        # Re-raise RuntimeError as-is
        raise
    except Exception as error:
        logger.error("[TTS] Generation failed: %s", error)
        raise RuntimeError(f"edge-tts failed: {error}") from error
