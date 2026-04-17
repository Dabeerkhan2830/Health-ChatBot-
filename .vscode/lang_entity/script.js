
const AZURE_CONFIG = {
    KEY: "YOUR_AZURE_LANGUAGE_KEY",
    ENDPOINT: "https://azurelang021.cognitiveservices.azure.com/",
};

// --- DOM ELEMENTS ---
const aiInput = document.getElementById('ai-input');
const charCountText = document.getElementById('char-total');
const analyzeBtn = document.getElementById('analyze-trigger');
const loader = document.getElementById('loader');
const welcomeMsg = document.getElementById('welcome-message');
const resultsContainer = document.getElementById('results-container');
const toast = document.getElementById('toast');

// Result Views
const langName = document.getElementById('lang-name');
const langIso = document.getElementById('lang-iso');
const langConfidence = document.getElementById('lang-confidence');
const langBar = document.getElementById('lang-bar');
const entitiesList = document.getElementById('entities-list');
const productSummary = document.getElementById('product-summary');
const vibeText = document.getElementById('vibe-text');
const barPos = document.getElementById('bar-pos');
const barNeu = document.getElementById('bar-neu');
const barNeg = document.getElementById('bar-neg');

/**
 * Update character counter
 */
aiInput.addEventListener('input', () => {
    const chars = aiInput.value.length;
    charCountText.textContent = `${chars} / 5000 chars`;
    if (chars > 5000) charCountText.style.color = "#ef4444";
    else charCountText.style.color = "#94a3b8";
});

/**
 * Handle Analysis Trigger
 */
analyzeBtn.addEventListener('click', async () => {
    const text = aiInput.value.trim();

    if (!text) {
        showToast("Please enter some text to analyze.", "warning");
        return;
    }

    if (text.length > 5000) {
        showToast("Text is too long for standard analysis. Limit to 5000 characters.", "error");
        return;
    }

    // Toggle UI State
    welcomeMsg.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    loader.classList.remove('hidden');
    analyzeBtn.disabled = true;

    try {
        const results = await performFullAzureAnalysis(text);
        renderIntelligence(results);
    } catch (err) {
        console.error("Azure Analysis Failed:", err);
        showToast("Analysis Error: " + err.message, "error");
        welcomeMsg.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

/**
 * Core Logic: Execute All Azure AI Tasks
 */
async function performFullAzureAnalysis(text) {
    const apiEndpoint = `${AZURE_CONFIG.ENDPOINT}/language/:analyze-text?api-version=2023-04-01`;
    const headers = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_CONFIG.KEY
    };

    const documents = [{ id: "doc1", text: text }];

    const tasks = [
        { kind: "LanguageDetection", analysisInput: { documents } },
        { kind: "EntityRecognition", analysisInput: { documents } },
        { kind: "KeyPhraseExtraction", analysisInput: { documents } },
        { kind: "SentimentAnalysis", analysisInput: { documents } }
    ];

    // Execute tasks in parallel for performance
    const responses = await Promise.all(tasks.map(task =>
        fetch(apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(task)
        }).then(res => {
            if (!res.ok) throw new Error(`${task.kind} task failed`);
            return res.json();
        })
    ));

    return {
        lang: responses[0].results.documents[0],
        entities: responses[1].results.documents[0].entities,
        keyPhrases: responses[2].results.documents[0].keyPhrases,
        sentiment: responses[3].results.documents[0]
    };
}

/**
 * UI Controller: Populate insights
 */
function renderIntelligence(data) {
    // 1. Language Detection
    const bestLang = data.lang.detectedLanguage;
    langName.textContent = bestLang.name;
    langIso.textContent = bestLang.iso6391Name.toUpperCase();
    const confScore = Math.round(bestLang.confidenceScore * 100);
    langConfidence.textContent = confScore + "%";
    langBar.style.width = confScore + "%";

    // 2. Named Entities
    entitiesList.innerHTML = '';
    if (data.entities.length === 0) {
        entitiesList.innerHTML = '<p class="text-muted">No prominent entities found.</p>';
    } else {
        data.entities.slice(0, 12).forEach(ent => {
            const tag = document.createElement('div');
            tag.className = 'tag animate-slide-in';
            tag.innerHTML = `
                <span class="tag-text">${ent.text}</span>
                <span class="tag-cat">${ent.category}</span>
            `;
            entitiesList.appendChild(tag);
        });
    }

    // 3. AI Insight Summary (Heuristic Synthesis)
    productSummary.innerHTML = '';
    const phrases = data.keyPhrases;
    if (phrases.length === 0) {
        productSummary.innerHTML = '<p>The provided content lacks specific key attributes to generate a detailed summary.</p>';
    } else {
        const top1 = phrases[0].charAt(0).toUpperCase() + phrases[0].slice(1);
        const others = phrases.slice(1, 4).join(', ');
        const allMain = phrases.slice(0, 6).join(' • ');

        productSummary.innerHTML = `
            <div class="summary-box">
                <p><strong>Primary Context:</strong> This text is fundamentally centered around <strong>${top1}</strong>.</p>
                <p style="margin-top: 10px;"><strong>Key Themes:</strong> Associated concepts include <em>${others}</em>. The context suggests a technical or descriptive focus on these core attributes.</p>
                <p style="margin-top: 15px; font-size: 0.8rem; color: #64748b;">Keywords: ${allMain}</p>
            </div>
        `;
    }

    // 4. Sentiment Viz
    vibeText.textContent = data.sentiment.sentiment.toUpperCase();
    vibeText.style.color = getVibeColor(data.sentiment.sentiment);

    updateScoreBar('bar-pos', data.sentiment.confidenceScores.positive);
    updateScoreBar('bar-neu', data.sentiment.confidenceScores.neutral);
    updateScoreBar('bar-neg', data.sentiment.confidenceScores.negative);

    // Final reveal
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function updateScoreBar(id, score) {
    const el = document.getElementById(id);
    const pct = Math.round(score * 100);
    el.style.setProperty('--w', pct + '%');
    // Using CSS variable for animated width if needed, or direct style
    el.style.width = pct + '%';
}

function getVibeColor(vibe) {
    if (vibe === 'positive') return '#10b981';
    if (vibe === 'negative') return '#ef4444';
    return '#f59e0b';
}

function showToast(msg, type = 'info') {
    toast.textContent = msg;
    toast.className = `toast visible ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 4000);
}

// Copy Summary functionality
document.getElementById('copy-summary').addEventListener('click', () => {
    const text = productSummary.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Intelligence report copied!", "success");
    });
});
