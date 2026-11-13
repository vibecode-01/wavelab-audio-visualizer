
/* WAVELAB - Python integration */

(() => {

    "use strict";

    const fileInput = document.getElementById("fileInput");

    const player = document.querySelector(".player");

    if (!fileInput || !player) return;


    // -----------------------------
    // CREATE ANALYSIS PANEL
    // -----------------------------

    const style = document.createElement("style");

    style.textContent = `

    .py-analysis {
        margin-top: 14px;
        padding: 16px;
        border: 1px solid #29334a;
        border-radius: 12px;
        background: linear-gradient(125deg,#141c2b,#17182b);
    }

    .py-analysis-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:10px;
    }

    .py-analysis-title {
        font-size:11px;
        font-weight:800;
        letter-spacing:1.2px;
        color:#dfe9f7;
    }

    .py-api-state {
        font-size:10px;
        color:#9aa8bd;
    }

    .py-api-state.online {
        color:#79e9b6;
    }

    .py-api-state.offline {
        color:#ffb08f;
    }

    .py-analysis-message {
        color:#9aa8bd;
        font-size:10px;
        line-height:1.6;
    }

    .py-metrics {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin-top:12px;
    }

    .py-metric {
        padding:10px;
        border-radius:9px;
        background:#0d1421;
        border:1px solid #28334a;
    }

    .py-metric-label {
        font-size:9px;
        color:#8797af;
        text-transform:uppercase;
    }

    .py-metric-value {
        margin-top:5px;
        color:#e9f2ff;
        font-size:14px;
        font-weight:750;
    }

    @media(max-width:600px) {
        .py-metrics {
            grid-template-columns:repeat(2,1fr);
        }
    }

    `;

    document.head.appendChild(style);


    const panel = document.createElement("section");

    panel.className = "py-analysis";

    panel.innerHTML = `

        <div class="py-analysis-head">

            <div class="py-analysis-title">
                PYTHON AUDIO ANALYSIS
            </div>

            <div class="py-api-state" id="pyApiState">
                Checking backend...
            </div>

        </div>

        <div
            class="py-analysis-message"
            id="pyAnalysisMessage"
            aria-live="polite"
        >
            Upload a PCM WAV file to calculate
            audio measurements using Python.
        </div>

        <div class="py-metrics" id="pyMetrics"></div>

    `;

    player.insertAdjacentElement("afterend", panel);


    const apiState = document.getElementById("pyApiState");

    const message = document.getElementById("pyAnalysisMessage");

    const metrics = document.getElementById("pyMetrics");


    // -----------------------------
    // UPDATE STATUS MESSAGE
    // -----------------------------

    function setMessage(text) {

        message.textContent = text;

        metrics.replaceChildren();

    }


    // -----------------------------
    // DISPLAY ANALYSIS RESULTS
    // -----------------------------

    function addMetric(label, value) {

        const card = document.createElement("div");

        card.className = "py-metric";

        const title = document.createElement("div");

        title.className = "py-metric-label";

        title.textContent = label;

        const output = document.createElement("div");

        output.className = "py-metric-value";

        output.textContent = value;

        card.append(title, output);

        metrics.appendChild(card);

    }


    // -----------------------------
    // CHECK PYTHON SERVER
    // -----------------------------

    async function checkBackend() {

        try {

            const response = await fetch("/api/health");

            if (!response.ok) {
                throw new Error("Server unavailable");
            }

            const data = await response.json();

            if (data.status !== "ok") {
                throw new Error("Invalid response");
            }

            apiState.textContent = "PYTHON ONLINE";

            apiState.className = "py-api-state online";

            setMessage(
                "Python backend connected. Upload a PCM WAV file for analysis."
            );

        }

        catch (error) {

            apiState.textContent = "PYTHON OFFLINE";

            apiState.className = "py-api-state offline";

            setMessage(
                "Python backend is unavailable at this address. " +
                "Open the Render-hosted WAVELAB website."
            );

        }

    }


    // -----------------------------
    // SEND AUDIO TO PYTHON
    // -----------------------------

    async function analyzeWithPython(file) {

        if (!file) return;

        const isWav = (
            file.name.toLowerCase().endsWith(".wav") ||
            file.type === "audio/wav" ||
            file.type === "audio/x-wav"
        );

        if (!isWav) {

            setMessage(
                "Browser visualization supports this audio format. " +
                "Python analysis currently requires an uncompressed PCM WAV file."
            );

            return;

        }

        if (file.size > 20 * 1024 * 1024) {

            setMessage(
                "File exceeds the 20 MB Python analysis limit."
            );

            return;

        }

        apiState.textContent = "ANALYSING...";

        apiState.className = "py-api-state";

        setMessage(
            "Python is analysing your audio. The file is processed in memory."
        );


        const form = new FormData();

        form.append("audio", file, file.name);


        try {

            const response = await fetch(
                "/api/analyze",
                {
                    method: "POST",
                    body: form
                }
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error || "Audio analysis failed."
                );

            }


            apiState.textContent = "ANALYSIS COMPLETE";

            apiState.className = "py-api-state online";


            setMessage(
                "Python successfully analysed " +
                data.file_name +
                ". Results use evenly spaced PCM samples."
            );


            addMetric(
                "Duration",
                data.duration_seconds + " s"
            );

            addMetric(
                "Sample rate",
                data.sample_rate_hz.toLocaleString() + " Hz"
            );

            addMetric(
                "Channels",
                data.channel_label
            );

            addMetric(
                "Bit depth",
                data.bit_depth + " bit"
            );

            addMetric(
                "Peak level",
                data.peak_dbfs + " dBFS"
            );

            addMetric(
                "RMS level",
                data.rms_dbfs + " dBFS"
            );

            addMetric(
                "Clipped samples",
                data.clipped_sample_percent + "%"
            );

            addMetric(
                "Analysis points",
                data.analysis_points.toLocaleString()
            );

        }

        catch (error) {

            apiState.textContent = "ANALYSIS FAILED";

            apiState.className = "py-api-state offline";

            setMessage(error.message);

        }

    }


    // -----------------------------
    // AUDIO UPLOAD LISTENER
    // -----------------------------

    // Capture phase ensures this runs before
    // the existing player clears the file input.

    fileInput.addEventListener(
        "change",
        event => {

            const file = event.target.files &&
                         event.target.files[0];

            if (file) {

                analyzeWithPython(file);

            }

        },
        true
    );


    // Check backend when website opens.

    checkBackend();

})();
