document.addEventListener('DOMContentLoaded', () => {
    // --- 1. UI Element Selectors ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const promptView = document.getElementById('drop-zone-prompt');
    const processingView = document.getElementById('processing-view');
    const resultView = document.getElementById('result-view');
    const imagePreview = document.getElementById('image-preview');
    const fenOutput = document.getElementById('fen-output');
    const copyBtn = document.getElementById('copy-btn');
    const resetBtn = document.getElementById('reset-btn');
    const lichessLink = document.getElementById('lichess-link');

    // --- 2. File Input Handlers ---

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => {
        dropZone.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(eName => {
        dropZone.addEventListener(eName, () => dropZone.classList.add('dragging'), false);
    });

    ['dragleave', 'drop'].forEach(eName => {
        dropZone.addEventListener(eName, () => dropZone.classList.remove('dragging'), false);
    });

    dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

    // Click to Browse
    fileInput.addEventListener('change', function () { handleFiles(this.files); });

    // Paste from Clipboard (Ctrl+V)
    document.addEventListener('paste', (e) => {
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            handleFiles(e.clipboardData.files);
        }
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please provide an image file.');
            return;
        }
        processFile(file);
    }

    // --- 3. Processing & Backend Communication ---

    function processFile(file) {
        showPanel(processingView);

        // Load local preview immediately
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => { imagePreview.src = reader.result; };

        const formData = new FormData();
        formData.append('image', file);

        // Send to Flask for Image-to-FEN conversion
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error('Server error');
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert("Error: " + data.error);
                    showPanel(promptView);
                } else {
                    // 1. Show Result UI
                    showResult(data.fen);

                    // 2. Update to the cropped version from server
                    imagePreview.src = `/debug/cropped_board.png?t=${new Date().getTime()}`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error connecting to backend.');
                showPanel(promptView);
            });
    }

    // --- 4. UI Updates ---

    function showResult(fenString) {
        showPanel(resultView);
        fenOutput.value = fenString;

        // Update Lichess Link
        const formattedFen = fenString.replace(/ /g, '_');
        lichessLink.href = `https://lichess.org/analysis/standard/${formattedFen}`;
    }

    function showPanel(panelToShow) {
        [promptView, processingView, resultView].forEach(p => p.classList.add('hidden'));
        panelToShow.classList.remove('hidden');
    }

    const uploadBtn = document.querySelector('.upload-btn');

    // Manual trigger for the hidden file input
    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    // --- 5. Interactivity ---

    copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(fenOutput.value);
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

    lichessLink.addEventListener('click', (e) => e.stopPropagation());
});