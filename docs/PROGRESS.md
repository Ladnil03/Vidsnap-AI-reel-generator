# Security Audit Progress

## Wave 1: Critical Security

| Task | Status | Notes |
|------|--------|-------|
| W1-1 | ALREADY FIXED | Direct upload has auth (get_current_user), key-prefix ownership, streaming 413 cap, ext + magic-bytes validation, disabled in prod. Tests exist in tests/security/test_media_direct_upload.py (7 pass). serve_local_file traversal guarded via _resolve_path is_relative_to (W1-5 too). |
| W1-2 | DONE | Prepatch (commit 095c9d9) added assert_key_owned + reel_studio/from-key/worker checks. This session closed remaining gaps: POST /videos create_video now validates video_key/thumbnail_key; worker reel + native jobs re-check via central is_key_owned; cloudinary presigned signature pins resource_type/allowed_formats/max_file_size. 4 new tests in tests/security/test_key_ownership.py. Commit 47481fa. |