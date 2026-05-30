from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vidsnap.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

db            = SQLAlchemy(app)
bcrypt        = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view    = 'login'
login_manager.login_message = 'Please log in to access this page.'

# ── MODELS ──

class User(UserMixin, db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(80),  unique=True, nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reels      = db.relationship('Reel',     backref='user', lazy=True)
    feedbacks  = db.relationship('Feedback', backref='user', lazy=True)

class Reel(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    title      = db.Column(db.String(200), nullable=False)
    video_url  = db.Column(db.String(500))
    thumbnail  = db.Column(db.String(500))
    duration   = db.Column(db.String(20))
    status     = db.Column(db.String(20), default='processing')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Feedback(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    rating     = db.Column(db.Integer, nullable=False)
    message    = db.Column(db.Text, nullable=False)
    category   = db.Column(db.String(50), default='general')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ── HELPERS ──

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ── ROUTES ──

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        if not username or not email or not password:
            flash('All fields are required.', 'error')
            return render_template('register.html')
        if password != confirm:
            flash('Passwords do not match.', 'error')
            return render_template('register.html')
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'error')
            return render_template('register.html')
        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'error')
            return render_template('register.html')
        if User.query.filter_by(username=username).first():
            flash('Username already taken.', 'error')
            return render_template('register.html')

        hashed = bcrypt.generate_password_hash(password).decode('utf-8')
        user   = User(username=username, email=email, password=hashed)
        db.session.add(user)
        db.session.commit()
        flash('Account created! Please log in.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    if request.method == 'POST':
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        remember = request.form.get('remember') == 'on'
        user     = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            flash(f'Welcome back, {user.username}!', 'success')
            return redirect(next_page or url_for('home'))
        else:
            flash('Invalid email or password.', 'error')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'success')
    return redirect(url_for('home'))

@app.route('/create', methods=['GET', 'POST'])
@login_required
def create():
    if request.method == 'POST':
        try:
            images         = request.files.getlist('images')
            voiceover_text = request.form.get('voiceover_text', '').strip()
            voice          = request.form.get('voice', 'natural')
            duration       = request.form.get('duration', '3')

            # Validate inputs
            if not voiceover_text:
                return jsonify({'success': False, 'error': 'Voiceover text is required'}), 400
            if not images or all(img.filename == '' for img in images):
                return jsonify({'success': False, 'error': 'At least one image is required'}), 400

            # Save uploaded images
            saved_images = []
            for img in images:
                if img and img.filename and allowed_file(img.filename):
                    ext      = os.path.splitext(secure_filename(img.filename))[1].lower()
                    filename = f"{uuid.uuid4().hex}{ext}"
                    path     = os.path.join(UPLOAD_FOLDER, filename)
                    img.save(path)
                    saved_images.append(filename)

            if not saved_images:
                return jsonify({'success': False, 'error': 'No valid images uploaded. Use PNG, JPG, JPEG or WEBP.'}), 400

            # Build URLs
            thumbnail_url = f"/static/uploads/{saved_images[0]}"
            video_url     = thumbnail_url  # Replace with real video URL after FFmpeg generation

            # Build title from voiceover text
            title = voiceover_text[:50] + ('…' if len(voiceover_text) > 50 else '')

            # Calculate estimated duration
            try:
                dur_per_frame  = float(duration)
                total_duration = int(dur_per_frame * len(saved_images))
                duration_str   = f"{total_duration}s"
            except Exception:
                duration_str = f"{len(saved_images) * 3}s"

            # Save reel to DB
            reel = Reel(
                title     = title,
                video_url = video_url,
                thumbnail = thumbnail_url,
                duration  = duration_str,
                status    = 'ready',
                user_id   = current_user.id
            )
            db.session.add(reel)
            db.session.commit()

            return jsonify({'success': True, 'reel_id': reel.id})

        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    return render_template('create.html')

@app.route('/gallery')
@login_required
def gallery():
    reels = Reel.query.filter_by(user_id=current_user.id)\
                      .order_by(Reel.created_at.desc()).all()
    return render_template('gallery.html', reels=reels)

@app.route('/feedback', methods=['GET', 'POST'])
@login_required
def feedback():
    if request.method == 'POST':
        rating   = request.form.get('rating')
        message  = request.form.get('message', '').strip()
        category = request.form.get('category', 'general')

        if not rating or not message:
            flash('Please provide a rating and message.', 'error')
            return render_template('feedback.html')

        try:
            fb = Feedback(
                rating   = int(rating),
                message  = message,
                category = category,
                user_id  = current_user.id
            )
            db.session.add(fb)
            db.session.commit()
            flash('Thank you for your feedback!', 'success')
            return redirect(url_for('home'))
        except Exception as e:
            db.session.rollback()
            flash('Something went wrong. Please try again.', 'error')

    return render_template('feedback.html')

@app.route('/delete_reel/<int:reel_id>', methods=['POST'])
@login_required
def delete_reel(reel_id):
    reel = Reel.query.get_or_404(reel_id)
    if reel.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        # Delete thumbnail file from disk
        if reel.thumbnail:
            filepath = reel.thumbnail.lstrip('/')
            if os.path.exists(filepath):
                os.remove(filepath)
        db.session.delete(reel)
        db.session.commit()
        return '', 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('404.html'), 500

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

# ── INIT DB ──
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)