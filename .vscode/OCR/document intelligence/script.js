/* File: document intelligence/script.js */
const state = {
    selectedModel: 'prebuilt-read',
    file: null,
    config: { 
        endpoint: localStorage.getItem('DI_ENDPOINT') || 'https://mydocument01.cognitiveservices.azure.com/', 
        key: localStorage.getItem('DI_KEY') || 'YOUR_DOCUMENT_INTELLIGENCE_KEY' 
    }
};

const UI = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-picker'),
    previewStage: document.getElementById('preview-stage'),
    imgPreview: document.getElementById('doc-preview'),
    analyzeBtn: document.getElementById('analyze-btn'),
    contentBox: document.getElementById('content-box'),
    metaBox: document.getElementById('meta-box'),
    status: document.getElementById('conn-status'),
    navBtns: document.querySelectorAll('.nav-btn'),
    modal: document.getElementById('modal'),
    endpointInput: document.getElementById('endpoint'),
    keyInput: document.getElementById('api-key'),
    saveCfgBtn: document.getElementById('save-cfg'),
    closeModalBtn: document.getElementById('close-modal'),
    openSettingsBtn: document.getElementById('open-settings')
};

// Initialize
function init() {
    UI.endpointInput.value = state.config.endpoint;
    UI.keyInput.value = state.config.key;
    updateStatus();
}

function updateStatus() {
    if (state.config.key && state.config.endpoint) {
        UI.status.textContent = 'Connected';
        UI.status.classList.add('online');
    } else {
        UI.status.textContent = 'Disconnected';
        UI.status.classList.remove('online');
    }
}

// Model Selection
UI.navBtns.forEach(btn => {
    btn.onclick = () => {
        UI.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedModel = btn.dataset.model;
        document.getElementById('current-model-title').textContent = btn.textContent;
    };
});

// File Handlers
UI.dropZone.onclick = (e) => { 
    if (e.target.id !== 'clear-file') UI.fileInput.click(); 
};

UI.fileInput.onchange = (e) => handleFile(e.target.files[0]);

UI.dropZone.ondragover = (e) => { e.preventDefault(); UI.dropZone.classList.add('dragging'); };
UI.dropZone.ondragleave = () => UI.dropZone.classList.remove('dragging');
UI.dropZone.ondrop = (e) => {
    e.preventDefault();
    UI.dropZone.classList.remove('dragging');
    handleFile(e.dataTransfer.files[0]);
};

function handleFile(file) {
    if (!file) return;
    state.file = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        UI.imgPreview.src = file.type.includes('pdf') ? 'https://logodesignfx.com/wp-content/uploads/2019/04/pdf-icon.png' : ev.target.result;
        UI.previewStage.classList.remove('hidden');
        UI.analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

document.getElementById('clear-file').onclick = (e) => {
    e.stopPropagation();
    state.file = null;
    UI.previewStage.classList.add('hidden');
    UI.analyzeBtn.disabled = true;
};

// Analysis Core
UI.analyzeBtn.onclick = async () => {
    if (!state.config.key || !state.config.endpoint) {
        UI.modal.classList.remove('hidden');
        return;
    }

    try {
        UI.analyzeBtn.textContent = 'Analyzing...';
        UI.analyzeBtn.disabled = true;
        UI.contentBox.innerHTML = '<div style="color:var(--accent);">Processing Document Intelligence task...</div>';

        const baseUrl = state.config.endpoint.replace(/\/$/, "");
        
        // Define potential API paths to try for better compatibility across regions/resources
        const apiPaths = [
            `/documentintelligence/documentModels/${state.selectedModel}:analyze?api-version=2024-02-29-preview`, // Modern v4.0
            `/formrecognizer/documentModels/${state.selectedModel}:analyze?api-version=2023-07-31`               // Stable v3.1
        ];

        let postResponse = null;
        let lastError = null;

        for (const path of apiPaths) {
            const analyzeUrl = `${baseUrl}${path}`;
            console.log(`Attempting analysis via: ${analyzeUrl}`);
            
            try {
                postResponse = await fetch(analyzeUrl, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': state.config.key,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: state.file
                });

                if (postResponse.ok) break;
                
                const errData = await postResponse.json();
                lastError = errData.error?.message || postResponse.statusText;
                console.warn(`Path ${path} failed: ${lastError}`);
            } catch (e) {
                lastError = e.message;
            }
        }

        if (!postResponse || !postResponse.ok) {
            let errorMsg = `Analyze Request Failed: ${lastError || 'Resource not found'}`;
            if (lastError?.includes('Resource not found') || postResponse?.status === 404) {
                errorMsg = `<b>Error 404: Resource Not Found</b><br><br>
                This usually means one of the following:<br>
                1. Your Azure resource is <b>Computer Vision</b> but this code needs <b>Document Intelligence</b>.<br>
                2. Your <b>Endpoint URL</b> is incorrect (ensure it looks like https://YOUR-NAME.cognitiveservices.azure.com).<br>
                3. The <b>Region</b> of your resource doesn't support these API versions.`;
            }
            throw new Error(errorMsg);
        }

        const operationLocation = postResponse.headers.get('Operation-Location');
        if (!operationLocation) throw new Error('No Operation-Location received. Ensure you are using a Document Intelligence resource.');

        // Polling
        let result = null;
        while (true) {
            const pollRes = await fetch(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': state.config.key }
            });
            result = await pollRes.json();
            if (result.status === 'succeeded') break;
            if (result.status === 'failed') throw new Error('Analysis task failed on Azure side.');
            await new Promise(r => setTimeout(r, 1500));
        }

        renderResults(result.analyzeResult);
    } catch (err) {
        UI.contentBox.innerHTML = `<div style="color:#f55; background: rgba(255,0,0,0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,0,0,0.2);">${err.message}</div>`;
    } finally {
        UI.analyzeBtn.textContent = 'Run Analysis';
        UI.analyzeBtn.disabled = false;
    }
};

function renderResults(data) {
    // Text Content
    UI.contentBox.innerHTML = data.content ? data.content.split('\n').map(line => `<div>${line}</div>`).join('') : 'No text content extracted.';
    
    // JSON Metadata
    UI.metaBox.innerHTML = `<pre class="json-viewer">${JSON.stringify(data.pages?.[0] || data, null, 2)}</pre>`;
}

// Modal and Settings
UI.openSettingsBtn.onclick = () => UI.modal.classList.remove('hidden');
UI.closeModalBtn.onclick = () => UI.modal.classList.add('hidden');
UI.saveCfgBtn.onclick = () => {
    state.config.key = UI.keyInput.value;
    state.config.endpoint = UI.endpointInput.value;
    localStorage.setItem('DI_KEY', state.config.key);
    localStorage.setItem('DI_ENDPOINT', state.config.endpoint);
    updateStatus();
    UI.modal.classList.add('hidden');
};

init();
