# 🎬 VidSnap.AI — AI-Powered Video Reel Generator

VidSnap AI is a modern web application that automatically generates vertical (1080x1920) video reels from uploaded images and narration text. It utilizes **FastAPI** on the backend, **Flask** for the frontend rendering, **MongoDB** for database storage, **edge-tts** for neural voiceovers, **FFmpeg** for video compilation, and **Cloudinary** for video hosting.

---

## 🚀 Key Features

* **Multi-Image Processing**: Upload up to 20 images to compile sequentially into a reel.
* **AI Neural Voiceover**: Generate high-quality voice narration from text scripts using Microsoft Edge neural voices (Warm/Natural, Smooth/Elegant, or Powerful/Bold).
* **Flexible Durations**: Customize frame pacing by selecting image display times (1s to 8s).
* **Robust Background Worker**: Offloads heavy media processing (audio generation + video stitching + cloud uploading) to an asynchronous queue worker to prevent web server locking.
* **OTP Password Recovery**: Secure self-serve password recovery backed by **Gmail SMTP** and built-in brute-force protection (locks out after 5 invalid attempts).
* **Reel Gallery**: Dynamic, paginated, lazy-loaded media gallery with interactive video lightbox player.
* **Token System**: Built-in authorization quota limit (5 free tokens on signup, manageable by system admins).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | FastAPI, Pydantic v2, Motor (Async MongoDB), Uvicorn |
| **Frontend Server** | Flask, Jinja2 Templates |
| **Frontend Styling** | Vanilla CSS (Harmonious Dark Theme, Glassmorphism, Steppers) |
| **Database** | MongoDB Atlas (Async Driver) |
| **Media Processing** | FFmpeg (Subprocess wrapped in thread pools) |
| **Text-To-Speech** | `edge-tts` (Free Microsoft Neural Voices) |
| **Cloud Storage** | Cloudinary SDK |
| **Email Gateway** | Gmail SMTP (Built-in `smtplib` + SSL) |

---

## 📁 Repository Structure

```text
├── backend/
│   ├── config.py              # Central Pydantic BaseSettings config
│   ├── database.py            # Async MongoDB connection setup & indexes
│   ├── main.py                # FastAPI application instance & middlewares
│   ├── models.py              # Pydantic validation schemas
│   ├── worker.py              # Async background queue worker
│   ├── routes/
│   │   ├── auth.py            # Sign Up, Login, and Password Recovery
│   │   ├── admin.py           # Quota edits, User stats, & platform logs
│   │   ├── jobs.py            # Job submission & status polling
│   │   ├── reels.py           # User gallery listings & deletions
│   │   └── ...
│   └── services/
│       ├── ffmpeg_service.py  # Concat file building and FFmpeg stitching
│       ├── storage_service.py # Cloudinary asset uploads and deletions
│       └── email_service.py   # Gmail SMTP secure OTP dispatcher
│
├── frontend/
│   ├── app.py                 # Flask server (serving HTML templates)
│   ├── templates/             # Jinja2 HTML pages
│   └── static/
│       ├── css/               # Modular styling rules
│       └── js/                # API wrapper, gallery loops, & creation steppers
│
├── .env.example               # Reference configurations template
├── run.py                     # Launcher file for backend FastAPI
└── requirements.txt           # Python dependency manifests
```

---

## ⚙️ Installation & Local Setup

### 📋 Prerequisites
* **Python 3.10+**
* **MongoDB Instance** (Local or MongoDB Atlas Cluster)
* **FFmpeg** installed and added to your system's PATH.

### 1. Clone the repository and navigate inside:
```bash
git clone https://github.com/Ladnil03/Vidsnap-AI-reel-generator.git
cd vidsnap-ai
```

### 2. Set up a virtual environment:
```bash
# On Windows
python -m venv env
.\env\Scripts\activate

# On macOS/Linux
python3 -m venv env
source env/bin/activate
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables:
Copy the `.env.example` file to `.env` in the root folder and fill in the details:
```bash
cp .env.example .env
```

Review the values inside `.env`:
* **MongoDB**: Enter your connection string and database name.
* **Cloudinary**: Input your credentials (`cloud_name`, `api_key`, `api_secret`).
* **Gmail SMTP**: Configure `EMAIL_FROM` and `GMAIL_APP_PASSWORD` (see Gmail setup guide below).

---

## ✉️ Gmail SMTP App Password Configuration

To allow VidSnap AI to send Forgot Password OTP emails to any address for free, set up a secure **Google App Password**:

1. Open your **[Google Account](https://myaccount.google.com/)** settings.
2. Go to the **Security** tab.
3. Turn **ON** **2-Step Verification** (required to generate App Passwords).
4. Search for **"App Passwords"** in the top bar.
5. Create a new App Password, name it **"VidSnap AI"**, and hit generate.
6. Copy the **16-character code** generated (e.g. `abcd efgh ijkl mnop`).
7. Paste this code into your `.env` file as `GMAIL_APP_PASSWORD` and set your Gmail address as `EMAIL_FROM`.

---

## 🏃 Running the Application

For local development, you need to run both the FastAPI backend and the Flask frontend server. Ensure your virtual environment is active in both terminals.

### Start the Backend (FastAPI on Port 8000)
```bash
python run.py
```

### Start the Frontend (Flask on Port 5500)
```bash
python frontend/app.py
```

Navigate your browser to **`http://localhost:5500`** to access the web portal. To view/interact with the interactive API schemas, visit **`http://localhost:8000/docs`**.

---

## 👑 Creating an Admin Account

Admin users can view all users, manage token budgets, inspect global feedback, and view platform logs.
To create your first admin user, run the interactive helper CLI:
```bash
python create_admin.py
```
Log in on the main site (`http://localhost:5500/login`) using the credentials you entered.

---

## ☁️ Deployment Guidelines (Render)

When deploying to Render, configure the services as follows:

1. **FastAPI Backend (Web Service)**:
   * Build Command: `pip install -r requirements.txt`
   * Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port 10000`
   * *Note: Render's Free tier blocks SMTP ports 25, 465, and 587. If you deploy the backend on Render's Free tier, SMTP-based email flows will be blocked. To send emails in production on a free plan, verify a custom domain on **Resend.com** and swap the SMTP connection out for Resend's HTTP API.*
2. **Flask Frontend (Web Service)**:
   * Build Command: `pip install -r requirements.txt`
   * Start Command: `gunicorn --bind 0.0.0.0:10000 frontend.app:app`
   * Set Environment Variable: `BACKEND_URL` pointing to your deployed FastAPI service URL.
