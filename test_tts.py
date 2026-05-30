#!/usr/bin/env python3
"""
Standalone test script for the VidSnap AI TTS service.

Tests edge-tts (Microsoft Edge neural voices) integration.
Completely free — no API key required.
"""

import asyncio
import sys
from pathlib import Path

from backend.services.tts_service import generate_audio


async def main():
    """Run the TTS test."""
    try:
        # Create test directory
        test_dir = Path("/tmp/vidsnap/test_tts")
        test_dir.mkdir(parents=True, exist_ok=True)

        # Define test text
        test_text = (
            "This is a test of the edge TTS service for VidSnap AI. "
            "The voice is powered by Microsoft Edge neural voices "
            "and is completely free to use."
        )

        # Call the TTS service
        audio_path = await generate_audio(
            text=test_text,
            output_dir=test_dir,
        )

        # Verify the file exists
        if not audio_path.exists():
            print("TTS TEST FAILED")
            print(f"Error: Audio file not found at {audio_path}")
            sys.exit(1)

        # Get file size in KB
        file_size_bytes = audio_path.stat().st_size
        file_size_kb = file_size_bytes / 1024

        # Verify file is not empty
        if file_size_bytes == 0:
            print("TTS TEST FAILED")
            print("Error: Generated audio file is empty")
            sys.exit(1)

        # Print results
        print(f"Audio path: {audio_path}")
        print(f"File size: {file_size_kb:.2f} KB")
        print("TTS TEST PASSED")
        sys.exit(0)

    except Exception as error:
        print("TTS TEST FAILED")
        print(f"Error: {error}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
