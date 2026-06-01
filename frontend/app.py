from flask import Flask, render_template
import os

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'vidsnap-flask-key')

# ── PAGES — Flask only serves HTML, all data comes from FastAPI ──

@app.route('/')
def home():
    return render_template('index.html', active_page='home')

@app.route('/login')
def login():
    return render_template('login.html', active_page='')

@app.route('/register')
def register():
    return render_template('register.html', active_page='')

@app.route('/create')
def create():
    return render_template('create.html', active_page='create')

@app.route('/gallery')
def gallery():
    return render_template('gallery.html', active_page='gallery')

@app.route('/feedback')
def feedback():
    return render_template('feedback.html', active_page='feedback')

@app.route('/profile')
def profile():
    return render_template('profile.html', active_page='profile')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True, port=5500)

@app.errorhandler(500)
def server_error(e):
    return render_template('404.html'), 500

if __name__ == '__main__':
    app.run(debug=True, port=5500)