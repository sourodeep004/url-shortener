from flask import Flask, request, jsonify, redirect, render_template
import sqlite3
import secrets
import string
from urllib.parse import urlparse

app = Flask(__name__)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db():

    connection = sqlite3.connect("urls.db")

    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# CREATE / UPDATE DATABASE
# ============================================================

def init_db():

    connection = get_db()

    # Create table if it doesn't exist
    connection.execute("""
        CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_url TEXT NOT NULL,
            short_code TEXT NOT NULL UNIQUE
        )
    """)

    # Check existing columns
    columns = connection.execute("""
        PRAGMA table_info(urls)
    """).fetchall()

    column_names = [
        column["name"]
        for column in columns
    ]

    # Add clicks column if it doesn't exist
    if "clicks" not in column_names:

        connection.execute("""
            ALTER TABLE urls
            ADD COLUMN clicks INTEGER DEFAULT 0
        """)

    connection.commit()

    connection.close()


# ============================================================
# URL VALIDATION
# ============================================================

def is_valid_url(url):

    try:

        parsed_url = urlparse(url)

        return (
            parsed_url.scheme in ["http", "https"]
            and bool(parsed_url.netloc)
        )

    except Exception:

        return False


# ============================================================
# GENERATE UNIQUE SHORT CODE
# ============================================================

def generate_unique_short_code():

    connection = get_db()

    characters = (
        string.ascii_letters +
        string.digits
    )

    while True:

        short_code = ''.join(
            secrets.choice(characters)
            for _ in range(6)
        )

        existing = connection.execute("""
            SELECT id
            FROM urls
            WHERE short_code = ?
        """, (
            short_code,
        )).fetchone()

        if existing is None:

            connection.close()

            return short_code


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    return render_template("index.html")


# ============================================================
# CREATE SHORT URL
# ============================================================

@app.route("/api/shorten", methods=["POST"])
def shorten_url():

    # Get JSON body
    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "error": "Request body must contain JSON"
        }), 400

    # Get URL
    original_url = data.get("url")

    # URL must be a string
    if not isinstance(original_url, str):

        return jsonify({
            "error": "URL must be a string"
        }), 400

    # Remove spaces
    original_url = original_url.strip()

    # Empty URL
    if not original_url:

        return jsonify({
            "error": "URL is required"
        }), 400

    # Maximum URL length
    if len(original_url) > 2048:

        return jsonify({
            "error": (
                "URL is too long. "
                "Maximum length is 2048 characters."
            )
        }), 400

    # Validate URL
    if not is_valid_url(original_url):

        return jsonify({
            "error": (
                "Please provide a valid "
                "HTTP or HTTPS URL"
            )
        }), 400

    connection = get_db()

    # ========================================================
    # CHECK FOR EXISTING URL
    # ========================================================

    existing = connection.execute("""
        SELECT short_code
        FROM urls
        WHERE original_url = ?
        LIMIT 1
    """, (
        original_url,
    )).fetchone()

    # ========================================================
    # URL ALREADY EXISTS
    # ========================================================

    if existing:

        short_code = existing["short_code"]

        connection.close()

        short_url = (
            request.host_url +
            short_code
        )

        return jsonify({

            "original_url": original_url,

            "short_code": short_code,

            "short_url": short_url,

            "already_exists": True,

            "message": (
                "This URL already exists. "
                "We've returned your existing short URL."
            )

        }), 200

    # ========================================================
    # CREATE NEW SHORT URL
    # ========================================================

    short_code = generate_unique_short_code()

    connection.execute("""
        INSERT INTO urls (
            original_url,
            short_code,
            clicks
        )
        VALUES (?, ?, 0)
    """, (
        original_url,
        short_code
    ))

    connection.commit()

    connection.close()

    short_url = (
        request.host_url +
        short_code
    )

    return jsonify({

        "original_url": original_url,

        "short_code": short_code,

        "short_url": short_url,

        "already_exists": False,

        "message": "URL shortened successfully!"

    }), 201


# ============================================================
# REDIRECT SHORT URL
# ============================================================

@app.route("/<short_code>")
def redirect_to_original(short_code):

    connection = get_db()

    result = connection.execute("""
        SELECT original_url
        FROM urls
        WHERE short_code = ?
    """, (
        short_code,
    )).fetchone()

    # Short code doesn't exist
    if result is None:

        connection.close()

        return "Short URL not found", 404

    # Increase click count
    connection.execute("""
        UPDATE urls
        SET clicks = clicks + 1
        WHERE short_code = ?
    """, (
        short_code,
    ))

    connection.commit()

    connection.close()

    # Redirect
    return redirect(
        result["original_url"]
    )


# ============================================================
# GET ALL SHORTENED URLS
# ============================================================

@app.route("/api/urls", methods=["GET"])
def get_urls():

    connection = get_db()

    results = connection.execute("""
        SELECT
            original_url,
            short_code,
            clicks
        FROM urls
        ORDER BY id DESC
    """).fetchall()

    connection.close()

    urls = []

    for row in results:

        urls.append({

            "original_url":
                row["original_url"],

            "short_code":
                row["short_code"],

            "short_url":
                request.host_url +
                row["short_code"],

            "clicks":
                row["clicks"]

        })

    return jsonify(urls)


# ============================================================
# START APPLICATION
# ============================================================

if __name__ == "__main__":

    init_db()

    app.run(
        debug=True
    )