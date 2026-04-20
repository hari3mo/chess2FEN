document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // UI Panels
    const promptView = document.getElementById('drop-zone-prompt');
    const processingView = document.getElementById('processing-view');
    const resultView = document.getElementById('result-view');

    // Result Elements
    const imagePreview = document.getElementById('image-preview');
    const fenOutput = document.getElementById('fen-output');
    const copyBtn = document.getElementById('copy-btn');
    const resetBtn = document.getElementById('reset-btn');
    const lichessLink = document.getElementById('lichess-link');

    // Eval Bar Elements
    const evalFill = document.getElementById('eval-fill');
    const evalLabel = document.getElementById('eval-label');

    // --- 1. File Input Methods ---

    // A. Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragging'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragging'), false);
    });

    dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

    // B. Click to Browse
    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    // C. Paste from Clipboard (Ctrl+V)
    document.addEventListener('paste', (e) => {
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            handleFiles(e.clipboardData.files);
        }
    });

    // --- 2. Core Processing ---

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];

        if (!file.type.startsWith('image/')) {
            alert('Please provide an image file.');
            return;
        }

        processFile(file);
    }

    function processFile(file) {
        showPanel(processingView);

        // Load immediate image preview locally so the user sees what they pasted
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            imagePreview.src = reader.result;
        };

        // Package the file to send to Python
        const formData = new FormData();
        formData.append('image', file);

        // Send the file to your Flask API
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert("Error: " + data.error);
                    showPanel(promptView);
                } else {
                    // Successfully got the real data back!

                    // Format the evaluation number (e.g., 1.5 -> "+1.50")
                    let evalStr = "";
                    if (data.evaluation >= 9000) {
                        evalStr = "+M";
                    } else if (data.evaluation <= -9000) {
                        evalStr = "-M";
                    } else {
                        evalStr = (data.evaluation > 0 ? "+" : "") + data.evaluation.toFixed(2);
                    }

                    // Update the preview to the cropped version from the server
                    imagePreview.src = `/debug/cropped_board.png?t=${new Date().getTime()}`;

                    // Update the UI with the real FEN and Eval
                    showResult(data.fen, evalStr, data.evaluation);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error connecting to backend. Check your server console.');
                showPanel(promptView);
            });
    }

    // --- 3. UI Updates ---

    function showResult(fenString, evalStr, evalNumber) {
        showPanel(resultView);

        // Populate FEN
        fenOutput.value = fenString;

        // Populate Lichess Link (replace spaces with underscores)
        const formattedFen = fenString.replace(/ /g, '_');
        lichessLink.href = `https://lichess.org/analysis/standard/${formattedFen}`;

        // Populate Eval Bar
        updateEvalBar(evalStr, evalNumber);
    }

    function updateEvalBar(scoreStr, scoreInPawns) {
        evalLabel.textContent = scoreStr;

        let whitePercentage = 50;

        // Handle Mate
        if (scoreStr.includes('M')) {
            whitePercentage = scoreStr.startsWith('-') ? 0 : 100;
        } else {
            // Standard evaluation using sigmoid math
            const winProb = 1 / (1 + Math.exp(-(scoreInPawns * 100) / 400));
            whitePercentage = winProb * 100;
        }

        evalFill.style.height = `${whitePercentage}%`;
    }

    function showPanel(panelToShow) {
        [promptView, processingView, resultView].forEach(panel => {
            panel.classList.add('hidden');
        });
        panelToShow.classList.remove('hidden');
    }

    // --- 4. Interactivity ---

    copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fenOutput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    });

    resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.value = '';
        imagePreview.src = '';
        fenOutput.value = '';
        showPanel(promptView);
    });

    lichessLink.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger the file input label click
    });
});