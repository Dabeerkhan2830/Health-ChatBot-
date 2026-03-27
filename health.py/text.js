

const CONFIG = {
    endpoint: localStorage.getItem('vita_endpoint') || '',
    key: localStorage.getItem('vita_key') || '',
    deployment: localStorage.getItem('vita_deployment') || '',
    apiVer: localStorage.getItem('vita_apiver') || '2024-02-15-preview'
};

let chatHistory = [
    { 
        role: "system", 
        content: "You are Me, an expert AI Health Assistant. You provide helpful, empathetic, and factual medical insights. You can analyze user text and visual images (medical diagrams, generic scans, etc.). Always remain professional. However, you must always include a soft disclaimer that you are an AI and not a substitute for professional medical advice." 
    }
];

let currentBase64Image = null;

// --- DOM ELEMENTS ---
const chatArea = document.getElementById('chatArea');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');
const mediaPreview = document.getElementById('mediaPreview');
const previewImg = document.getElementById('previewImg');
const removeImgBtn = document.getElementById('removeImgBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Modal
const credModal = document.getElementById('credModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveCredsBtn = document.getElementById('saveCredsBtn');
const toast = document.getElementById('toast');

// Modal Inputs
const epInput = document.getElementById('azureEndpoint');
const keyInput = document.getElementById('azureKey');
const depInput = document.getElementById('azureDeployment');
const verInput = document.getElementById('azureApiVer');
const modalError = document.getElementById('modalError');

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Show settings immediately if not configured
    if (!CONFIG.endpoint || !CONFIG.key || !CONFIG.deployment) {
        openModal();
    }
});

// --- SETTINGS (MODAL) ---
function openModal() {
    epInput.value = CONFIG.endpoint;
    keyInput.value = CONFIG.key;
    depInput.value = CONFIG.deployment;
    verInput.value = CONFIG.apiVer;
    modalError.classList.add('hidden');
    credModal.classList.remove('hidden');
}

settingsBtn.addEventListener('click', openModal);

closeModalBtn.addEventListener('click', () => {
    credModal.classList.add('hidden');
});

saveCredsBtn.addEventListener('click', () => {
    const ep = epInput.value.trim();
    const ky = keyInput.value.trim();
    const dp = depInput.value.trim();
    const vr = verInput.value.trim();

    if (!ep || !ky || !dp) {
        modalError.textContent = "Endpoint, Key, and Deployment Name are required.";
        modalError.classList.remove('hidden');
        return;
    }

    // Save to local storage
    localStorage.setItem('vita_endpoint', ep);
    localStorage.setItem('vita_key', ky);
    localStorage.setItem('vita_deployment', dp);
    localStorage.setItem('vita_apiver', vr);

    // Update runtime config
    CONFIG.endpoint = ep;
    CONFIG.key = ky;
    CONFIG.deployment = dp;
    CONFIG.apiVer = vr;

    credModal.classList.add('hidden');
    showToast("Credentials successfully encrypted and saved in browser!");
});

// --- UI HELPERS ---
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('toast-show');
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}

function scrollToBottom() {
    chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: 'smooth'
    });
}

function addMessageToUI(role, text, imgSrc = null) {
    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `message fade-in ${isUser ? 'user-msg' : 'ai-msg'}`;

    const icon = isUser ? "fa-user" : "fa-robot";
    let imgHtml = imgSrc ? `<img src="${imgSrc}" alt="User attachment" />` : "";
    
    // Convert markdown basic newlines to <br>
    const formattedText = text.replace(/\n/g, '<br>');

    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fas ${icon}"></i></div>
        <div class="msg-bubble">
            <p>${formattedText}</p>
            ${imgHtml}
        </div>
    `;

    chatArea.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const typingId = "typing-" + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ai-msg fade-in`;
    msgDiv.id = typingId;
    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fas fa-heartbeat"></i></div>
        <div class="msg-bubble typing">
            <span></span><span></span><span></span>
        </div>
    `;
    chatArea.appendChild(msgDiv);
    scrollToBottom();
    return typingId;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- FILE ATTACHMENT ---
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Please select an image file.");
        return;
    }

    try {
        currentBase64Image = await fileToBase64(file);
        previewImg.src = currentBase64Image;
        mediaPreview.classList.remove('hidden');
    } catch (err) {
        showToast("Error reading file.");
    }
    // reset file input
    fileInput.value = '';
});

removeImgBtn.addEventListener('click', () => {
    currentBase64Image = null;
    mediaPreview.classList.add('hidden');
    previewImg.src = "";
});

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- CHAT LOGIC ---
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

sendBtn.addEventListener('click', handleSend);

async function handleSend() {
    const text = promptInput.value.trim();
    
    if (!text && !currentBase64Image) return;
    
    if (!CONFIG.endpoint || !CONFIG.key) {
        showToast("Please configure Settings first.");
        openModal();
        return;
    }

    // 1. Render User Message
    addMessageToUI('user', text, currentBase64Image);
    promptInput.value = '';
    
    // 2. Prepare Payload Message
    let userPayload = { role: "user", content: [] };
    
    if (text) {
        userPayload.content.push({ type: "text", text: text });
    }
    
    if (currentBase64Image) {
        userPayload.content.push({
            type: "image_url",
            image_url: { url: currentBase64Image }
        });
        
        // Clear UI preview immediately
        currentBase64Image = null;
        mediaPreview.classList.add('hidden');
        previewImg.src = '';
    }

    // Since basic text roles can just be strings, format properly for OpenAI Vision
    // If it's pure text, OpenAI prefers a string. If it's multimodal, it prefers the array.
    if (userPayload.content.length === 1 && userPayload.content[0].type === "text") {
        userPayload.content = text;
    }

    chatHistory.push(userPayload);
    sendBtn.disabled = true;
    promptInput.disabled = true;

    // 3. Call AI
    const typingId = showTypingIndicator();

    try {
        const responseText = await queryAzureOpenAI(chatHistory);
        
        removeTypingIndicator(typingId);
        addMessageToUI('assistant', responseText);
        
        chartHistoryAddAssistant(responseText);
        
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToUI('assistant', "⚠️ Error: " + error.message);
        chatHistory.pop(); // Remove the user message from history so they can retry
    } finally {
        sendBtn.disabled = false;
        promptInput.disabled = false;
        promptInput.focus();
    }
}

function chartHistoryAddAssistant(text) {
    chatHistory.push({ role: "assistant", content: text });
}

// --- AZURE OPENAI PIPELINE ---
async function queryAzureOpenAI(messages) {
    const url = `${CONFIG.endpoint.replace(/\/$/, '')}/openai/deployments/${CONFIG.deployment}/chat/completions?api-version=${CONFIG.apiVer}`;
    
    const bodyPayload = {
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': CONFIG.key
        },
        body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP Request Failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
