# Security Audit Progress

## Wave 1: Critical Security

| Task | Status | Notes |
|------|--------|-------|
| W1-1 | ALREADY FIXED | Direct upload has auth (get_current_user), key-prefix ownership, streaming 413 cap, ext + magic-bytes validation, disabled in prod. Tests exist in tests/security/test_media_direct_upload.py (7 pass). serve_local_file traversal guarded via _resolve_path is_relative_to (W1-5 too). |
| W1-2 | DONE | Prepatch (commit 095c9d9) added assert_key_owned + reel_studio/from-key/worker checks. This session closed remaining gaps: POST /videos create_video now validates video_key/thumbnail_key; worker reel + native jobs re-check via central is_key_owned; cloudinary presigned signature pins resource_type/allowed_formats/max_file_size. 4 new tests in tests/security/test_key_ownership.py. Commit 47481fa. |
| W1-3 | DONE | Guard already covered JWT/debug/storage/origins (commit 0805a32). Added missing MONGODB_URI / REDIS_URL default rejection in _validate_production_safety; 2 new tests. METRICS_TOKEN already present. Commit 47aa77a. |
| W1-4 | DONE | XFF trust already done (commit 473d7e1). This session: rate_limit_per_email now hashes body email (was a stub returning IP); rate_limit_per_user now keys on get_current_user (request.state.user_id was never set, so it silently fell back to IP). Applied per-email to login/signup/forgot/reset; per-user to reel-studio jobs, room create, companion chat. 3 new tests in tests/security/test_rate_limiter.py. Commit b609172. |
| W1-5 | ALREADY FIXED | sibling-prefix rejection tested in test_media_direct_upload.py (media_storage_evil). |
| W1-6 | DONE | OTP resend no longer resets the attempt counter (counter preserved via $setOnInsert), 60s resend cooldown blocks regeneration, and a locked-out OTP (5 fails) now stays locked instead of being deleted, so re-request cannot bypass lockout. 3 new tests in tests/security/test_otp_attempts.py. Commit pending. |