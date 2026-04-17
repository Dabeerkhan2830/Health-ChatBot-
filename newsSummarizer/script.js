
// --- CONFIGURATION ---
const LANG_CONFIG = {
    endpoint: localStorage.getItem('ls_ep') || '',
    key: localStorage.getItem('ls_ky') || '',
    apiVersion: '2023-04-01'
};

// --- DOM ELEMENTS ---
const newsContent = document.getElementById('newsContent');
const newsUrl = document.getElementById('newsUrl');
const runBtn = document.getElementById('runBtn');
const summaryType = document.getElementById('summaryType');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');
const resultsArea = document.getElementById('resultsArea');

const summaryOutput = document.getElementById('summaryOutput');
const entitiesBox = document.getElementById('entitiesBox');
const datesBox = document.getElementById('datesBox');

// Modal Elements
const configBtn = document.getElementById('configBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const modalMsg = document.getElementById('modalMsg');

const epInput = document.getElementById('epInput');
const kyInput = document.getElementById('kyInput');

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if (!LANG_CONFIG.endpoint || !LANG_CONFIG.key) {
        showModal();
    }
});

// --- UI LOGIC ---
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.dataset.mode;
        if (mode === 'text') {
            newsContent.classList.remove('hidden');
            newsUrl.classList.add('hidden');
        } else {
            newsContent.classList.add('hidden');
            newsUrl.classList.remove('hidden');
        }
    });
});

configBtn.addEventListener('click', showModal);
closeModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));

function showModal() {
    epInput.value = LANG_CONFIG.endpoint;
    kyInput.value = LANG_CONFIG.key;
    modalMsg.classList.add('hidden');
    modalOverlay.classList.remove('hidden');
}

saveBtn.addEventListener('click', () => {
    const ep = epInput.value.trim();
    const ky = kyInput.value.trim();

    localStorage.setItem('ls_ep', ep);
    localStorage.setItem('ls_ky', ky);

    LANG_CONFIG.endpoint = ep;
    LANG_CONFIG.key = ky;

    modalOverlay.classList.add('hidden');
    showToast("Language Service Settings Updated.");
});

async function testLink() {
    const ep = epInput.value.trim();
    const ky = kyInput.value.trim();

    if (!ep || !ky) {
        setModalMsg("Configuration incomplete.", "#ff4444");
        return;
    }

    testBtn.disabled = true;
    testBtn.innerText = "TESTING...";

    try {
        const cleanEp = ep.replace(/\/$/, '');
        const url = `${cleanEp}/language/:analyze-text?api-version=2023-04-01`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': ky },
            body: JSON.stringify({
                kind: "LanguageDetection",
                analysisInput: { documents: [{ id: "1", text: "Hello" }] }
            })
        });
        
        if (res.ok) {
            setModalMsg("✅ Link Success!", "#00ff88");
        } else {
            if (res.status === 404) {
                setModalMsg(`❌ Resource Not Found (404). Check your Endpoint URL: ${cleanEp}`, "#ff4444");
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Error ${res.status}`);
            }
        }
    } catch (e) {
        setModalMsg("❌ " + e.message, "#ff4444");
    } finally {
        testBtn.disabled = false;
        testBtn.innerText = "TEST LINK";
    }
}

testBtn.addEventListener('click', testLink);

// --- ANALYSIS CORE (ASYNCHRONOUS) ---
async function runAnalysis() {
    const mode = document.querySelector('.toggle-btn.active').dataset.mode;
    const content = mode === 'text' ? newsContent.value.trim() : newsUrl.value.trim();

    if (!content) {
        showToast("No source input detected.");
        return;
    }

    if (!LANG_CONFIG.key) {
        showModal();
        return;
    }

    setProcessing(true);

    try {
        const cleanEp = LANG_CONFIG.endpoint.replace(/\/$/, '');
        const baseUrl = `${cleanEp}/language/analyze-text/jobs?api-version=${LANG_CONFIG.apiVersion}`;
        
        // 1. SUBMIT JOB
        const payload = {
            displayName: "News Summarization Job",
            analysisInput: { documents: [{ id: "1", language: "en", text: content }] },
            tasks: [
                {
                    kind: "AbstractiveSummarization",
                    taskName: "SummaryTask",
                    parameters: { sentenceCount: 3 }
                },
                {
                    kind: "EntityRecognition",
                    taskName: "EntityTask"
                }
            ]
        };

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': LANG_CONFIG.key
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Summarization Not Found (404). This region may not support Abstractive Summarization. Try East US or Sweden Central. \n (URL: ${baseUrl})`);
            }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Job Submission Failed: ${response.status}`);
        }

        // 2. GET OPERATION LOCATION
        const operationLocation = response.headers.get('operation-location');
        if (!operationLocation) throw new Error("No operation location returned.");

        // 3. POLL FOR RESULTS
        await pollForResult(operationLocation);

    } catch (e) {
        showToast("ERROR: " + e.message);
        setProcessing(false);
    }
}

async function pollForResult(url) {
    const maxAttempts = 30;
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(interval);
            showToast("Job timed out.");
            setProcessing(false);
            return;
        }

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Ocp-Apim-Subscription-Key': LANG_CONFIG.key }
            });

            if (!res.ok) throw new Error("Polling failed.");

            const data = await res.json();
            const status = data.status;

            if (status === 'succeeded') {
                clearInterval(interval);
                renderResults(data.tasks.items);
                setProcessing(false);
            } else if (status === 'failed') {
                clearInterval(interval);
                throw new Error("Job execution failed.");
            }
        } catch (e) {
            clearInterval(interval);
            showToast(e.message);
            setProcessing(false);
        }
    }, 2000); // Poll every 2 seconds
}

function renderResults(tasks) {
    emptyState.classList.add('hidden');
    resultsArea.classList.remove('hidden');

    // Add fade-in animation to the result sections
    const blocks = resultsArea.querySelectorAll('.result-block');
    blocks.forEach((b, i) => {
        b.style.animationDelay = `${i * 0.2}s`;
        b.classList.add('fade-in');
    });

    // Find summary and entities in results
    const summaryTask = tasks.find(t => t.kind === 'AbstractiveSummarization');
    const entityTask = tasks.find(t => t.kind === 'EntityRecognition');

    if (summaryTask && summaryTask.results.documents[0]) {
        const summarizationResults = summaryTask.results.documents[0].summaries;
        summaryOutput.innerHTML = `<p>${summarizationResults[0].text}</p>`;
    }

    if (entityTask && entityTask.results.documents[0]) {
        const entities = entityTask.results.documents[0].entities;
        
        // Filter entities by type
        const generalEntities = entities.filter(e => e.category !== 'DateTime');
        const temporalEntities = entities.filter(e => e.category === 'DateTime');

        renderTags(entitiesBox, generalEntities.map(e => e.text));
        renderTags(datesBox, temporalEntities.map(e => e.text));
    }
}

function renderTags(container, list) {
    container.innerHTML = "";
    if (list.length === 0) {
        container.innerHTML = "<span style='color:var(--text-secondary); font-size: 0.8rem;'>None detected</span>";
        return;
    }

    // Unique tags only
    const uniqueTags = [...new Set(list)];
    uniqueTags.slice(0, 10).forEach(t => {
        const span = document.createElement('span');
        span.className = "tag";
        span.textContent = t;
        container.appendChild(span);
    });
}

function setProcessing(isBusy) {
    runBtn.disabled = isBusy;
    runBtn.innerHTML = isBusy ? '<i class="fas fa-satellite fa-spin"></i> ANALYZING...' : 'GENERATE INSIGHTS';
    loader.classList.toggle('hidden', !isBusy);
}

function setModalMsg(msg, color) {
    modalMsg.textContent = msg;
    modalMsg.style.color = color;
    modalMsg.classList.remove('hidden');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

runBtn.addEventListener('click', runAnalysis);
