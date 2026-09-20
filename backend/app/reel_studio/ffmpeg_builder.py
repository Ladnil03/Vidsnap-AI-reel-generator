"""
FFmpeg Command Builder and Video Rendering Engine.
Builds 720p 9:16 vertical reels with blurred background framing,
streaming faststart flags, and strict CPU/memory limits.
"""

import asyncio
import logging
import shutil
from pathlib import Path

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


def get_ffmpeg_binary() -> str:
    """Resolve ffmpeg binary path from PATH or common fallback locations."""
    path_binary = shutil.which("ffmpeg")
    if path_binary:
        return path_binary

    # Windows fallback locations
    windows_candidates = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
    ]
    for candidate in windows_candidates:
        if Path(candidate).is_file():
            return candidate

    raise RuntimeError("FFmpeg is not installed or not found on PATH.")


def build_concat_file(
    image_paths: list[Path],
    scratch_dir: Path,
    image_duration: int = 3,
) -> Path:
    """Write FFmpeg concat demuxer file listing image sequence and duration."""
    concat_path = scratch_dir / "input.txt"
    with open(concat_path, "w", encoding="utf-8") as f:
        for img_path in image_paths:
            # Escape path for FFmpeg concat syntax
            escaped = str(img_path.resolve()).replace("\\", "/")
            f.write(f"file '{escaped}'\n")
            f.write(f"duration {image_duration}\n")
        # Repeat last file to ensure duration is respected by FFmpeg demuxer
        if image_paths:
            escaped_last = str(image_paths[-1].resolve()).replace("\\", "/")
            f.write(f"file '{escaped_last}'\n")
    return concat_path


def build_render_command(
    concat_file: Path,
    audio_file: Path,
    output_video: Path,
    width: int = 720,
    height: int = 1280,
) -> list[str]:
    """
    Construct FFmpeg command with:
    - Blurred 9:16 background padding
    - H.264 video encoding at CRF 23
    - Thread limit and fast preset for free-tier ARM VM
    - +faststart flag for progressive web streaming
    """
    ffmpeg_bin = get_ffmpeg_binary()

    # Filter graph: Scale background with crop and boxblur; scale foreground preserving aspect ratio; overlay centered
    filter_complex = (
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},boxblur=20:5[bg];"
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v]"
    )

    return [
        ffmpeg_bin,
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-i", str(audio_file),
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", settings.ffmpeg_preset,
        "-threads", str(settings.ffmpeg_threads),
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "96k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-movflags", "+faststart",
        str(output_video),
    ]


async def render_video(
    image_paths: list[Path],
    audio_path: Path,
    scratch_dir: Path,
    image_duration: int = 3,
) -> Path:
    """Execute FFmpeg render process asynchronously with timeout and error checking."""
    output_video = scratch_dir / "reel.mp4"
    concat_file = build_concat_file(image_paths, scratch_dir, image_duration)

    cmd = build_render_command(
        concat_file=concat_file,
        audio_file=audio_path,
        output_video=output_video,
        width=settings.target_video_width,
        height=settings.target_video_height,
    )

    logger.info("Executing FFmpeg rendering: %s", " ".join(cmd[:8]) + " ...")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=settings.ffmpeg_timeout_seconds,
        )
    except TimeoutError:
        proc.kill()
        raise RuntimeError(
            f"FFmpeg rendering timed out after {settings.ffmpeg_timeout_seconds}s"
        ) from None

    if proc.returncode != 0:
        err_msg = stderr.decode("utf-8", errors="replace")
        logger.error("FFmpeg execution failed (code %d): %s", proc.returncode, err_msg[-500:])
        raise RuntimeError(f"FFmpeg failed with exit code {proc.returncode}")

    if not output_video.exists() or output_video.stat().st_size == 0:
        raise RuntimeError("FFmpeg completed but output video was not created or is 0 bytes.")

    logger.info("Video rendering successful: %s (%d bytes)", output_video.name, output_video.stat().st_size)
    return output_video


async def generate_thumbnail(video_path: Path, scratch_dir: Path) -> Path:
    """Extract a thumbnail from the generated video."""
    thumbnail_path = scratch_dir / "thumbnail.jpg"
    ffmpeg_bin = get_ffmpeg_binary()

    cmd = [
        ffmpeg_bin,
        "-y",
        "-ss", "00:00:01",
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "3",
        str(thumbnail_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()
    return thumbnail_path
