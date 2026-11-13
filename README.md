
# WAVELAB — Audio Visualization Studio

WAVELAB is an interactive browser-based audio visualization platform with a Python Flask backend.

## Features

- Upload audio files.
- Live microphone visualization.
- Seven real-time visualization modes.
- Four customizable colour palettes.
- Adjustable sensitivity and smoothing.
- FFT resolution selection.
- Fullscreen visualization.
- Export visualizations as PNG.
- Python-powered WAV signal analysis.

## Visualization Modes

1. Spectrum Bars
2. Waveform
3. Mirror Spectrum
4. Radial Spectrum
5. Orbit Ring
6. Spectral Curve
7. Oscilloscope

## Technologies

- Python 3.13
- Flask
- HTML5
- CSS3
- JavaScript
- Web Audio API
- Canvas API

## Python Backend

The Flask backend provides:

- Audio duration analysis.
- Sampling frequency detection.
- Channel detection.
- Bit-depth detection.
- Peak amplitude calculation.
- RMS amplitude calculation.
- Clipping estimation.

Python analysis currently supports uncompressed PCM WAV files up to 20 MB.

Other browser-supported audio files can still be played and visualized.

## Privacy

Uploaded WAV files are processed in server memory and are not permanently stored.

Live microphone processing occurs locally in the browser.

## Hosting

Frontend and Python backend are hosted together using Render.

GitHub is used for source-code management.

**WAVELAB — Turn Sound Into Visuals.**
