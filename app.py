from flask import Flask, render_template

app = Flask(
    __name__,
    template_folder="frontend/templates",
    static_folder="frontend/static"
)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/create")
def create():
    return render_template("create.html")

@app.route("/gallery")
def gallery():
    return render_template("gallery.html", reels=[])

if __name__ == "__main__":
    app.run(debug=True)