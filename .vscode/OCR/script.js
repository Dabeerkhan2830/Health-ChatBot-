
const UI = {
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    uploadZone: document.getElementById('upload-zone'),
    previewContainer: document.getElementById('preview-container'),
    imagePreview: document.getElementById('image-preview'),
    removeBtn: document.getElementById('remove-btn'),
    processBtn: document.getElementById('process-btn'),
    resultsViewer: document.getElementById('results-viewer'),
    loader: document.getElementById('processing-loader'),
    copyBtn: document.getElementById('copy-btn'),
    clearBtn: document.getElementById('clear-btn'),
    navSettings: document.getElementById('nav-settings'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    endpointInput: document.getElementById('azure-endpoint'),
    keyInput: document.getElementById('azure-key'),
};

let currentFile = null;

// Initialize Settings
function loadSettings() {
    UI.endpointInput.value = localStorage.getItem('AZURE_ENDPOINT') || '';
    UI.keyInput.value = localStorage.getItem('AZURE_KEY') || '';
}

function saveSettings() {
    localStorage.setItem('AZURE_ENDPOINT', UI.endpointInput.value.trim());
    localStorage.setItem('AZURE_KEY', UI.keyInput.value.trim());
    UI.settingsModal.classList.add('hidden');
    showNotification('Settings saved successfully!');
}

// File Handlers
UI.browseBtn.onclick = () => UI.fileInput.click();

UI.fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
};

UI.uploadZone.ondragover = (e) => {
    e.preventDefault();
    UI.uploadZone.classList.add('dragging');
};

UI.uploadZone.ondragleave = () => UI.uploadZone.classList.remove('dragging');

UI.uploadZone.ondrop = (e) => {
    e.preventDefault();
    UI.uploadZone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
};

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc)');
        return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        UI.imagePreview.src = e.target.result;
        UI.uploadZone.classList.add('hidden');
        UI.previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

UI.removeBtn.onclick = () => {
    currentFile = null;
    UI.fileInput.value = '';
    UI.previewContainer.classList.add('hidden');
    UI.uploadZone.classList.remove('hidden');
    UI.resultsViewer.innerHTML = '<div class="empty-state"><div class="pulse-ring"></div><p>Awaiting input...</p></div>';
};

// OCR Processing Logic
UI.processBtn.onclick = async () => {
    const endpoint = localStorage.getItem('AZURE_ENDPOINT');
    const key = localStorage.getItem('AZURE_KEY');

    if (!endpoint || !key) {
        UI.settingsModal.classList.remove('hidden');
        return;
    }

    try {
        UI.resultsViewer.innerHTML = '<div class="processing-state"><div class="spinner"></div><p>Sending document to Azure...</p></div>';
        UI.loader.classList.remove('hidden');
        UI.processBtn.disabled = true;

        // Perform OCR analysis with Azure Vision v3.2 Read API
        const analyzeUrl = `${endpoint.replace(/\/$/, '')}/vision/v3.2/read/analyze`;
        
        const postResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/octet-stream'
            },
            body: currentFile
        });

        if (!postResponse.ok) {
            const errData = await postResponse.json().catch(() => ({}));
            let msg = errData.message || postResponse.statusText;
            
            // Helpful tip for 404 errors
            if (postResponse.status === 404) {
                msg = "Resource Not Found (404). Check if your endpoint is correct or if you should be using 'Document Intelligence' instead of 'Computer Vision'.";
            }
            throw new Error(msg);
        }

        const operationLocation = postResponse.headers.get('Operation-Location');
        if (!operationLocation) throw new Error('No Operation-Location returned by Azure.');

        // Polling loop
        UI.resultsViewer.innerHTML = '<div class="processing-state"><div class="spinner"></div><p>Azure is analyzing the text...</p></div>';
        let results = null;
        while (true) {
            const statusResponse = await fetch(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': key }
            });

            results = await statusResponse.json();
            if (results.status === 'succeeded') break;
            if (results.status === 'failed') throw new Error('Azure OCR task failed to process.');
            
            await new Promise(r => setTimeout(r, 1000));
        }

        displayResults(results.analyzeResult.readResults);
    } catch (error) {
        console.error('OCR Error:', error);
        UI.resultsViewer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p><strong>Analysis Failed</strong></p>
                <p class="error-msg">${error.message}</p>
                <button class="btn-secondary" onclick="document.getElementById('nav-settings').click()">Check Settings</button>
            </div>`;
    } finally {
        UI.loader.classList.add('hidden');
        UI.processBtn.disabled = false;
    }
};

function displayResults(readResults) {
    UI.resultsViewer.innerHTML = '';
    
    if (!readResults || readResults.length === 0) {
        UI.resultsViewer.innerHTML = '<div class="error-state">No text detected.</div>';
        return;
    }

    let fullText = "";
    let lineCount = 1;

    readResults.forEach(page => {
        page.lines.forEach(line => {
            const lineEl = document.createElement('div');
            lineEl.className = 'ocr-line';
            lineEl.innerHTML = `
                <span class="line-num">${lineCount.toString().padStart(2, '0')}.</span>
                <span class="line-text">${line.text}</span>
            `;
            UI.resultsViewer.appendChild(lineEl);
            fullText += line.text + "\n";
            lineCount++;
        });
    });

    UI.copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullText);
        showNotification('Text copied to clipboard!');
    };
}

// UI Controls
UI.navSettings.onclick = () => UI.settingsModal.classList.remove('hidden');
UI.closeSettings.onclick = () => UI.settingsModal.classList.add('hidden');
UI.saveSettings.onclick = saveSettings;
UI.clearBtn.onclick = () => {
    UI.resultsViewer.innerHTML = '<div class="empty-state"><div class="pulse-ring"></div><p>Awaiting input...</p></div>';
};

function showNotification(msg) {
    // Simple notification implementation if needed
    console.log(msg);
    // For now, use alert or a custom snackbar if UI allows
}

loadSettings();
console.log("OCR Logic Initialized.");
