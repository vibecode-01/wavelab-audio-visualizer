
from flask import Flask, jsonify, request, send_from_directory
from io import BytesIO
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import wave
import struct
import math
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)

# Maximum WAV upload size: 20 MB
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024


# -------------------------------
# WEBSITE HOME PAGE
# -------------------------------

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/python-integration.js")
def integration_script():
    return send_from_directory(BASE_DIR, "python-integration.js")


# -------------------------------
# PYTHON BACKEND STATUS
# -------------------------------

@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "WAVELAB Python Audio Analysis",
        "python": True
    })


# -------------------------------
# DECODE AUDIO SAMPLES
# -------------------------------

def decode_sample(data, offset, width):

    if width == 1:
        return (data[offset] - 128) / 128.0

    if width == 2:
        value = struct.unpack_from("<h", data, offset)[0]
        return value / 32768.0

    if width == 3:
        value = (
            data[offset]
            | (data[offset + 1] << 8)
            | (data[offset + 2] << 16)
        )

        if value & 0x800000:
            value -= 1 << 24

        return value / 8388608.0

    if width == 4:
        value = struct.unpack_from("<i", data, offset)[0]
        return value / 2147483648.0

    raise ValueError("Unsupported audio sample width")


# -------------------------------
# DECIBEL CALCULATION
# -------------------------------

def calculate_dbfs(value):

    if value <= 0:
        return -120.0

    return round(20 * math.log10(value), 2)


# -------------------------------
# PYTHON AUDIO ANALYSIS
# -------------------------------

@app.route("/api/analyze", methods=["POST"])
def analyze_audio():

    uploaded_file = request.files.get("audio")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "error": "Please select an audio file."
        }), 400

    filename = secure_filename(uploaded_file.filename)

    if not filename.lower().endswith(".wav"):
        return jsonify({
            "error": "Python analysis currently supports PCM WAV files only."
        }), 415

    file_data = uploaded_file.read(20 * 1024 * 1024 + 1)

    if len(file_data) > 20 * 1024 * 1024:
        return jsonify({
            "error": "Maximum upload size is 20 MB."
        }), 413

    try:

        with wave.open(BytesIO(file_data), "rb") as wav:

            channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
            sample_rate = wav.getframerate()
            frames = wav.getnframes()
            compression = wav.getcomptype()

            audio_data = wav.readframes(frames)

    except (wave.Error, EOFError, OSError) as error:

        return jsonify({
            "error": "Invalid or unsupported WAV file: " + str(error)
        }), 400

    if compression != "NONE":
        return jsonify({
            "error": "Only uncompressed PCM WAV files are supported."
        }), 415

    if sample_width not in (1, 2, 3, 4):
        return jsonify({
            "error": "Supported bit depths: 8, 16, 24 and 32."
        }), 415

    if channels < 1 or sample_rate < 1 or frames < 1:
        return jsonify({
            "error": "The audio file is empty or invalid."
        }), 400

    total_samples = min(
        frames * channels,
        len(audio_data) // sample_width
    )

    if total_samples == 0:
        return jsonify({
            "error": "No audio samples found."
        }), 400

    # Analyse evenly spaced samples for speed.
    max_points = 100000

    step = max(
        1,
        math.ceil(total_samples / max_points)
    )

    peak = 0.0
    sum_squares = 0.0
    count = 0
    clipped = 0

    try:

        for index in range(0, total_samples, step):

            offset = index * sample_width

            value = decode_sample(
                audio_data,
                offset,
                sample_width
            )

            magnitude = abs(value)

            peak = max(peak, magnitude)

            sum_squares += value * value
            count += 1

            if magnitude >= 0.999:
                clipped += 1

    except (ValueError, struct.error, IndexError) as error:

        return jsonify({
            "error": "Audio decoding failed: " + str(error)
        }), 400

    rms = math.sqrt(sum_squares / count)

    duration = frames / sample_rate

    return jsonify({

        "file_name": filename,

        "format": "PCM WAV",

        "duration_seconds": round(duration, 3),

        "sample_rate_hz": sample_rate,

        "channels": channels,

        "channel_label": (
            "Mono" if channels == 1
            else "Stereo" if channels == 2
            else str(channels) + " channels"
        ),

        "bit_depth": sample_width * 8,

        "peak_percent": round(peak * 100, 2),

        "rms_percent": round(rms * 100, 2),

        "peak_dbfs": calculate_dbfs(peak),

        "rms_dbfs": calculate_dbfs(rms),

        "clipped_sample_percent": round(
            clipped / count * 100, 3
        ),

        "analysis_points": count,

        "saved_on_server": False
    })


# -------------------------------
# FILE SIZE ERROR HANDLING
# -------------------------------

@app.errorhandler(RequestEntityTooLarge)
def file_too_large(error):

    return jsonify({
        "error": "Audio file exceeds the 20 MB limit."
    }), 413


# -------------------------------
# START SERVER
# -------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
