"""
VidSnap AI — Flask frontend server.

Flask's only job is serving HTML pages.
All data operations go through fetch() calls to the FastAPI backend.
No database, no sessions, no auth logic here.
"""

import os

from flask import Flask, render_template

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Injected from the environment in production so that the JS frontend
# points at the deployed Render backend URL without touching JS source code.
BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:8000")

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "vidsnap-flask-key")


# ---------------------------------------------------------------------------
# Page routes — Flask only serves HTML, all data comes from FastAPI
# ---------------------------------------------------------------------------


@app.route("/")
def home() -> str:
    """Serve the landing page."""
    return render_template("index.html", active_page="home", backend_url=BACKEND_URL)


@app.route("/login")
def login() -> str:
    """Serve the login page."""
    return render_template("login.html", active_page="", backend_url=BACKEND_URL)


@app.route("/register")
def register() -> str:
    """Serve the registration page."""
    return render_template("register.html", active_page="", backend_url=BACKEND_URL)


@app.route("/create")
def create() -> str:
    """Serve the reel creation page."""
    return render_template("create.html", active_page="create", backend_url=BACKEND_URL)


@app.route("/gallery")
def gallery() -> str:
    """Serve the gallery page."""
    return render_template("gallery.html", active_page="gallery", backend_url=BACKEND_URL)


@app.route("/feedback")
def feedback() -> str:
    """Serve the feedback page."""
    return render_template("feedback.html", active_page="feedback", backend_url=BACKEND_URL)


@app.route("/profile")
def profile() -> str:
    """Serve the user profile page."""
    return render_template("profile.html", active_page="profile", backend_url=BACKEND_URL)


# ---------------------------------------------------------------------------
# Error handlers — registered before __main__ so they always activate
# ---------------------------------------------------------------------------


@app.errorhandler(404)
def page_not_found(error: Exception) -> tuple:
    """Handle 404 Not Found errors."""
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(error: Exception) -> tuple:
    """Handle 500 Internal Server Error."""
    return render_template("404.html"), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5500))
    app.run(host="0.0.0.0", port=port)