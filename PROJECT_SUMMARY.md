# VidSnap AI - Project Summary

## Project Overview
**VidSnap AI** is an AI-powered FastAPI backend service that automatically generates 1080x1920 vertical MP4 video reels from uploaded images and narration text.

**Tech Stack:**
- FastAPI (web framework)
- Motor (async MongoDB driver)
- Groq API (Text-to-Speech)
- FFmpeg (video generation)
- Cloudinary (video storage & hosting)
- Pydantic (validation & settings)

---

## ✅ Completed Components

### 1. **Project Structure**
```
vidsnap-ai/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app & lifespan
│   ├── config.py            # Pydantic settings from .env
│   ├── database.py          # Motor MongoDB connection
│   ├── models.py            # API response schemas
│   ├── worker.py            # Background job processor
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── jobs.py          # POST /api/jobs, GET /api/jobs/{id}
│   │   └── reels.py         # GET /api/reels, DELETE /api/reels/{id}
│   ├── services/
│   │   ├── __init__.py
│   │   ├── tts_service.py   # Groq TTS (text → audio.mp3)
│   │   ├── ffmpeg_service.py # FFmpeg (images + audio → MP4)
│   │   └── storage_service.py # Cloudinary (upload/delete)
│   └── utils/
│       ├── __init__.py
│       └── file_handler.py  # Image validation
├── .env                     # Environment variables (gitignored)
├── .env.example            # Template for .env
├── .gitignore              # Git ignore rules
├── requirements.txt        # Pinned dependencies
└── README.md               # This file
```

---

### 2. **Core Configuration**

#### `backend/config.py`
- Pydantic BaseSettings loads from `.env`
- All 11 configuration fields with type annotations & inline comments
- Two computed properties:
  - `allowed_origins_list` → parses comma-separated CORS origins
  - `max_image_size_bytes` → converts MB to bytes

**Environment Variables:**
```
MONGODB_URI          # MongoDB Atlas connection string
MONGODB_DB           # Database name
CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET, FOLDER
GROQ_API_KEY, GROQ_TTS_MODEL, GROQ_TTS_VOICE
ALLOWED_ORIGINS      # Comma-separated frontend URLs
MAX_IMAGE_SIZE_MB    # Max upload size per image
WORKER_POLL_SECONDS  # Job polling interval
```

---

### 3. **Database Layer**

#### `backend/database.py`
- **`connect_db()`** → Initializes MongoDB connection, verifies with ping, creates indexes
- **`disconnect_db()`** → Gracefully closes connection
- **`get_db()`** → Returns active database (raises RuntimeError if not initialized)
- Compound index on `jobs` collection: `[("status", 1), ("created_at", 1)]`

---

### 4. **Data Models**

#### `backend/models.py`
**Response Models:**
- `JobStatus` = Literal["queued", "processing", "done", "failed"]
- `JobCreatedResponse` → Returned after POST /api/jobs (201)
- `JobStatusResponse` → Returned by GET /api/jobs/{id} (polls this)
- `ReelItem` → Single reel in gallery list
- `DeleteResponse` → Confirmation of deletion

All fields have `description=` for auto-generated API docs.

---

### 5. **API Endpoints**

#### `backend/routes/jobs.py`
**POST /api/jobs** (201 Created)
- Upload 1-10 images + voiceover text
- Validates images (JPEG/PNG/WEBP, ≤10 MB each)
- Saves to `/tmp/vidsnap/{job_id}/`
- Inserts "queued" job into MongoDB
- Returns `job_id` for polling

**GET /api/jobs/{job_id}**
- Frontend polls every 3 seconds
- Returns current status + reel_url (when done) or error_msg (when failed)
- 404 if job not found

#### `backend/routes/reels.py`
**GET /api/reels**
- Returns list of completed reels (status="done")
- Sorted newest first

**DELETE /api/reels/{job_id}**
- Attempts Cloudinary deletion (logs error but continues if fails)
- Deletes from MongoDB (source of truth)
- Returns `{"deleted": true, "job_id": "..."}`

---

### 6. **Service Layer** (Pure business logic, no FastAPI)

#### `backend/services/tts_service.py`
**`generate_audio(text, output_dir, api_key, model, voice)`**
- Calls Groq API with narration text
- Saves MP3 to `output_dir/audio.mp3`
- Raises RuntimeError on failure

#### `backend/services/ffmpeg_service.py`
**`check_ffmpeg()`** → Verifies FFmpeg is installed

**`build_concat_file(image_paths, output_dir)`** → Creates FFmpeg concat list

**`build_ffmpeg_command(...)`** → Builds full FFmpeg command with:
- 1080x1920 vertical scaling
- Black bars to maintain aspect ratio
- H.264 video + AAC audio
- 30 fps frame rate

**`generate_reel(image_filenames, tmp_dir, audio_path)`**
- Orchestrates full FFmpeg pipeline
- 300-second timeout per job
- Raises RuntimeError on failure

#### `backend/services/storage_service.py`
**`upload_reel(video_path, job_id)`**
- Uploads MP4 to Cloudinary folder
- Uses `job_id` as `public_id` for predictable deletion
- Returns `(secure_url, public_id)`

**`delete_reel(cloudinary_id)`** → Deletes from Cloudinary by public_id

---

### 7. **Background Worker**

#### `backend/worker.py`
**`run_worker()`** → Main infinite loop
- Polls MongoDB every `WORKER_POLL_SECONDS`
- Claims next "queued" job atomically (prevents race conditions)
- Executes 3-step pipeline:
  1. **Step 1:** Groq TTS (text → audio.mp3)
  2. **Step 2:** FFmpeg (images + audio → output.mp4)
  3. **Step 3:** Cloudinary (output.mp4 → public HTTPS URL)
- Updates MongoDB status at each step
- On failure: marks as "failed" with error message
- Always cleans up `/tmp/vidsnap/{job_id}/` temp directory

**Helper Functions:**
- `_claim_next_job()` → Atomic MongoDB find_one_and_update
- `_mark_done(job_id, reel_url, cloudinary_id)` → Sets status="done"
- `_mark_failed(job_id, error_message)` → Sets status="failed"
- `_cleanup_tmp(tmp_dir)` → Removes temp files

---

### 8. **Main Application**

#### `backend/main.py`
**Startup Sequence:**
1. Logging configured (INFO level, timestamp format)
2. Connect to MongoDB
3. Start background worker as asyncio task
4. Enable CORS middleware (uses `settings.allowed_origins_list`)
5. Register routers (jobs, reels)
6. Ready on `http://localhost:8000`

**Shutdown Sequence:**
1. Cancel worker task gracefully
2. Disconnect MongoDB
3. Clean shutdown

**Health Check:**
- `GET /` → `{"status": "ok", "app": "VidSnap AI", "version": "2.0.0"}`

**Auto-generated Docs:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 9. **File Validation**

#### `backend/utils/file_handler.py`
**Constants:**
```
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES_PER_JOB = 10
MIN_IMAGES_PER_JOB = 1
```

**`validate_image(file)`**
- Checks MIME type + file extension
- Raises HTTPException 400 with clear error messages

**`validate_image_list(files)`**
- Validates count (1-10 images)
- Validates each file individually
- Raises HTTPException 400 on failure

---

### 10. **Environment & Dependencies**

#### `requirements.txt` (Pinned versions)
```
fastapi==0.111.0
uvicorn==0.30.1
python-multipart==0.0.9
motor==3.4.0
cloudinary==1.40.0
groq==0.28.0
python-dotenv==1.0.1
aiofiles==23.2.1
pydantic==2.7.1
pydantic-settings==2.2.1
```

#### `.env` (Production secrets, .gitignored)
Contains actual credentials for:
- MongoDB Atlas connection
- Cloudinary API keys
- Groq API key

#### `.gitignore`
```
.env, __pycache__/, *.pyc, venv/, .venv/, node_modules/, /tmp/vidsnap/
```

---

### 11. **Git Setup**

#### Branch Structure
```
master (stable production)
  ↑
develop (team integration)
  ↑
backend/dev (your work)
```

**Remote:** `https://github.com/Ladnil03/Vidsnap-AI-reel-generator.git`

**Initial Commit:** "Initial backend scaffold - config, database, models, routes, and main app"

---

## 📊 API Flow

```
Frontend                          Backend
   |                                |
   |---(1) POST /api/jobs--------→  | Upload images + voiceover
   |        images, text           | Validate files
   |                                | Save to /tmp/
   |←---(2) HTTP 201-----------     | Insert job (queued)
   |        {job_id}               |
   |                                |
   |---(3) GET /api/jobs/{id}----→  | Check status every 3s
   |        Poll in loop            |
   |←---(4) status="queued"-----     | 
   |                                |
   |        [Background Worker]     |
   |         Step 1: Groq TTS      | text → audio.mp3
   |         Step 2: FFmpeg        | images+audio → output.mp4
   |         Step 3: Cloudinary    | upload → reel_url
   |         Mark: status="done"   |
   |                                |
   |←---(5) status="done"-----------| 
   |        reel_url (HTTPS)        |
   |                                |
   |---(6) GET /api/reels--------→  | Fetch all reels
   |←---(7) [ReelItem array]----     | Gallery list
   |                                |
   |---(8) DELETE /api/reels/{id}→  | Delete reel
   |←---(9) {deleted: true}-----     | Cloudinary + MongoDB
```

---

## 🚀 Running the Server

```bash
# Navigate to project
cd d:\Project\Reel-Generator\vidsnap-ai

# Activate virtual environment
.\env\Scripts\activate.ps1

# Start server
uvicorn backend.main:app --reload

# Or use Python directly
python -m uvicorn backend.main:app --reload
```

**Expected Startup Logs:**
```
Connecting to MongoDB at mongodb+srv://...
Database 'vidsnap' selected
MongoDB connection verified with ping
Compound index 'status_created_idx' created on jobs collection
Background worker started
VidSnap AI is ready
Uvicorn running on http://0.0.0.0:8000
```

---

## 🧪 Testing Checklist

- [ ] Test 1: POST /api/jobs (submit real job)
- [ ] Test 2: GET /api/jobs/{id} (poll status queued → processing → done)
- [ ] Test 3: Open reel_url in browser (video plays in 1080x1920)
- [ ] Test 4: GET /api/reels (gallery has reel)
- [ ] Test 5: MongoDB Atlas (document has all fields)
- [ ] Test 6: Cloudinary dashboard (MP4 appears in vidsnap-reels folder)
- [ ] Test 7: DELETE /api/reels/{id} (video removed)

---

## 📋 What's NOT Implemented Yet

- Frontend (React app - handled by team member)
- Database migrations (using manual indexing)
- Request logging middleware
- Rate limiting
- Authentication/JWT
- Pagination on GET /api/reels
- Job retry logic on failure
- Async email notifications

---

## 🔧 Key Architecture Decisions

1. **Async/await everywhere** → All I/O is non-blocking (Motor, aiofiles)
2. **Background worker as asyncio task** → No external job queue needed (single process for now)
3. **MongoDB as source of truth** → Jobs track complete pipeline state
4. **Graceful error handling** → Cloudinary failure doesn't block MongoDB cleanup
5. **Temp file cleanup in finally** → Always runs regardless of success/failure
6. **Pydantic validation first** → All inputs validated before processing
7. **Service layer isolation** → No FastAPI imports in services (pure logic)
8. **Structured logging** → Every key action logged with job_id prefix

---

## 📝 Notes for Continuation

- Team member handles frontend (React) in `frontend/` branch
- Merge both branches to `develop` for integration testing
- Final `develop` → `master` when fully tested
- Consider adding job retry on transient failures (network, timeout)
- FFmpeg requires system installation (not in pip)
- Worker processes one job at a time (sequential, not parallel)
- Increase `WORKER_POLL_SECONDS` to reduce DB load if needed

---

**Last Updated:** May 29, 2026  
**Status:** Backend fully implemented, ready for integration testing with frontend
