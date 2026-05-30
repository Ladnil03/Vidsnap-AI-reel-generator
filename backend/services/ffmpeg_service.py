"""
FFmpeg video generation service.

Combines uploaded images and a generated audio file into
a 1080x1920 vertical MP4 reel. This module has no FastAPI
imports — it is pure service logic.
"""

import logging
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

REEL_WIDTH: int = 1080
REEL_HEIGHT: int = 1920
FRAME_RATE: int = 30
IMAGE_DURATION_SECONDS: int = 3
OUTPUT_FILENAME: str = "output.mp4"
CONCAT_FILENAME: str = "input.txt"


def check_ffmpeg() -> None:
    """
    Verify that FFmpeg is installed and available on the system PATH.

    Raises:
        RuntimeError: If FFmpeg is not found on PATH.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "FFmpeg is not installed or not found on PATH. "
            "Install FFmpeg and ensure it is accessible."
        )


def build_concat_file(
    image_paths: list[Path],
    output_dir: Path,
) -> Path:
    """
    Write an FFmpeg concat file listing all images with their durations.

    FFmpeg uses this file to know which images to show and for how long.
    The last image is repeated without duration to prevent FFmpeg
    from cutting the video short.

    Args:
        image_paths: Ordered list of absolute paths to image files.
        output_dir: Directory where input.txt will be written.

    Returns:
        Path to the written concat file.
    """
    concat_path = output_dir / CONCAT_FILENAME

    with open(concat_path, "w") as f:
        # Write all images with duration
        for image_path in image_paths:
            f.write(f"file '{image_path.absolute()}'\n")
            f.write(f"duration {IMAGE_DURATION_SECONDS}\n")

        # Repeat last image without duration to prevent early cutoff
        if image_paths:
            f.write(f"file '{image_paths[-1].absolute()}'\n")

    logger.info("[FFmpeg] Concat file created with %d images", len(image_paths))
    return concat_path


def build_ffmpeg_command(
    concat_path: Path,
    audio_path: Path,
    output_path: Path,
) -> list[str]:
    """
    Build the FFmpeg command as a list of string arguments.

    Produces a 1080x1920 vertical MP4 with:
    - Images scaled to fill the frame, black bars on side if needed
    - Audio from the generated MP3
    - Video ends when audio ends (-shortest flag)
    - H.264 video codec, AAC audio codec
    - yuv420p pixel format for maximum compatibility

    Args:
        concat_path: Path to the FFmpeg concat list file.
        audio_path: Path to the generated audio.mp3.
        output_path: Path where the final MP4 will be written.

    Returns:
        List of strings representing the full FFmpeg command.
    """
    return [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_path),
        "-i",
        str(audio_path),
        "-vf",
        (
            f"scale={REEL_WIDTH}:{REEL_HEIGHT}:"
            f"force_original_aspect_ratio=decrease,"
            f"pad={REEL_WIDTH}:{REEL_HEIGHT}:"
            f"(ow-iw)/2:(oh-ih)/2:black"
        ),
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        "-r",
        str(FRAME_RATE),
        "-pix_fmt",
        "yuv420p",
        str(output_path),
    ]


async def generate_reel(
    image_filenames: list[str],
    tmp_dir: Path,
    audio_path: Path,
) -> Path:
    """
    Combine images and audio into a 1080x1920 vertical MP4 reel.

    Orchestrates the full FFmpeg pipeline:
    1. Verifies FFmpeg is available
    2. Resolves image paths from filenames
    3. Builds the FFmpeg concat file
    4. Runs FFmpeg as a subprocess
    5. Verifies the output file was created

    Args:
        image_filenames: Ordered list of image filenames (not full paths).
        tmp_dir: Directory containing the images and audio.
        audio_path: Path to the generated audio.mp3.

    Returns:
        Path to the generated output.mp4 file.

    Raises:
        RuntimeError: If FFmpeg is not installed, fails, or produces no output.
    """
    # Verify FFmpeg is available
    check_ffmpeg()

    # Resolve full paths to images
    image_paths = [tmp_dir / fname for fname in image_filenames]

    # Define output path
    output_path = tmp_dir / OUTPUT_FILENAME

    # Build concat file
    concat_path = build_concat_file(image_paths, tmp_dir)

    # Build FFmpeg command
    command = build_ffmpeg_command(concat_path, audio_path, output_path)

    # Log command at debug level
    logger.debug("[FFmpeg] Command: %s", " ".join(command))

    # Run FFmpeg
    logger.info("[FFmpeg] Starting reel generation...")

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            logger.error("[FFmpeg] Stderr: %s", result.stderr)
            raise RuntimeError(
                f"FFmpeg failed with exit code {result.returncode}. "
                "Check logs for stderr output."
            )

    except subprocess.TimeoutExpired as error:
        logger.error("[FFmpeg] Process timed out after 300 seconds")
        raise RuntimeError("FFmpeg timed out. Job took too long.") from error

    # Verify output was created
    if not output_path.exists():
        raise RuntimeError("FFmpeg completed but output.mp4 was not created.")

    logger.info("[FFmpeg] Reel created — %s", output_path)
    return output_path
