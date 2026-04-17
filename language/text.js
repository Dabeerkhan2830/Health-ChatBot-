
const AZURE_CONFIG = {
  KEY: "YOUR_AZURE_LANGUAGE_KEY",
  ENDPOINT: "https://mylang02.cognitiveservices.azure.com/",
};

// --- DOM ELEMENTS ---
const aiInput = document.getElementById('ai-input');
const wordCount = document.getElementById('word-count');
const charCount = document.getElementById('char-count');
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const loader = document.getElementById('loader');
const resultsArea = document.getElementById('results-area');
const toast = document.getElementById('toast');

// Result Fields
const resLangName = document.getElementById('res-lang-name');
const resLangCode = document.getElementById('res-lang-code');
const resLangScore = document.getElementById('res-lang-score');
const resLangBar = document.getElementById('res-lang-bar');
const resSentimentLabel = document.getElementById('res-sentiment-label');
const barPos = document.getElementById('bar-pos');
const barNeu = document.getElementById('bar-neu');
const barNeg = document.getElementById('bar-neg');
const valPos = document.getElementById('val-pos');
const valNeu = document.getElementById('val-neu');
const valNeg = document.getElementById('val-neg');
const entityContainer = document.getElementById('entities-container');
const resSummary = document.getElementById('res-summary');

/**
 * Update textarea counters
 */
aiInput.addEventListener('input', () => {
  const text = aiInput.value.trim();
  const chars = text.length;
  const words = text === "" ? 0 : text.split(/\s+/).length;

  charCount.textContent = `${chars} / 5000`;
  wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;

  if (chars > 5000) charCount.style.color = "var(--accent-red)";
  else charCount.style.color = "var(--text-secondary)";
});

/**
 * Handle Analysis Logic
 */
async function performAnalysis() {
  const text = aiInput.value.trim();

  if (!text) {
    showToast("Please enter some text to analyze.");
    return;
  }

  if (AZURE_CONFIG.KEY === "YOUR_AZURE_KEY") {
    showToast("API Key missing. Please update script.js");
    return;
  }

  // Prepare UI
  toggleLoading(true);
  resultsArea.classList.add('hidden');

  const apiEndpoint = `${AZURE_CONFIG.ENDPOINT.replace(/\/$/, "")}/language/:analyze-text?api-version=2023-04-01`;

  const reqLang = {
    "kind": "LanguageDetection",
    "analysisInput": { "documents": [{ "id": "1", "text": text }] }
  };

  const reqSent = {
    "kind": "SentimentAnalysis",
    "analysisInput": { "documents": [{ "id": "1", "text": text }] }
  };

  const reqEntity = {
    "kind": "EntityRecognition",
    "analysisInput": { "documents": [{ "id": "1", "text": text }] }
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AZURE_CONFIG.KEY
    };

    const [langRes, sentRes, entityRes] = await Promise.all([
      fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(reqLang) }),
      fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(reqSent) }),
      fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(reqEntity) })
    ]);

    if (!langRes.ok || !sentRes.ok || !entityRes.ok) {
        throw new Error("One or more analysis tasks failed.");
    }

    const langData = await langRes.json();
    const sentData = await sentRes.json();
    const entityData = await entityRes.json();
    
    // For summarization, we'll simulate a professional product description summary 
    // derived from key phrases and entities if the text is short, or handle it as a separate mock 
    // unless the user has a long-running job endpoint setup.
    // For this demo, let's add a "KeyPhraseExtraction" task for summarization context.
    const reqKey = {
        "kind": "KeyPhraseExtraction",
        "analysisInput": { "documents": [{ "id": "1", "text": text }] }
    };
    const keyRes = await fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(reqKey) });
    const keyData = keyRes.ok ? await keyRes.json() : null;

    renderResults({ langData, sentData, entityData, keyData });

  } catch (error) {
    console.error("Analysis Error:", error);
    showToast(error.message);
  } finally {
    toggleLoading(false);
  }
}

/**
 * Render Data to UI
 */
function renderResults(data) {
  try {
    const langDocs = data.langData.results?.documents || [];
    const sentDocs = data.sentData.results?.documents || [];

    if (langDocs.length === 0 || sentDocs.length === 0) {
      const err = data.langData.results?.errors?.[0] || data.sentData.results?.errors?.[0];
      throw new Error(err ? `Azure API Error: ${err.error.message}` : "No documents returned from Azure.");
    }

    // 1. Language Parsing
    const langDoc = langDocs[0].detectedLanguage;

    resLangName.textContent = langDoc.name;
    resLangCode.textContent = langDoc.iso6391Name.toUpperCase();
    const langConfidence = Math.round(langDoc.confidenceScore * 100);
    resLangScore.textContent = langConfidence + "%";
    resLangBar.style.width = langConfidence + "%";

    // 2. Sentiment Parsing
    const sentDoc = sentDocs[0];
    const scores = sentDoc.confidenceScores;

    resSentimentLabel.textContent = sentDoc.sentiment;
    resSentimentLabel.style.color = getSentimentColor(sentDoc.sentiment);

    updateBar(barPos, valPos, scores.positive);
    updateBar(barNeu, valNeu, scores.neutral);
    updateBar(barNeg, valNeg, scores.negative);

    // 3. Entity Parsing
    const entityDocs = data.entityData.results?.documents || [];
    if (entityDocs.length > 0) {
        const entities = entityDocs[0].entities;
        renderEntities(entities);
    }

    // 4. Summary / Key Product Info
    const keyDocs = data.keyData?.results?.documents || [];
    if (keyDocs.length > 0) {
        const keyPhrases = keyDocs[0].keyPhrases;
        generateProductSummary(keyPhrases, langDoc.name);
    }

    // Show Section
    resultsArea.classList.remove('hidden');
    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'end' });

  } catch (err) {
    showToast(`Error: ${err.message}`);
    console.error("Render Error details:", err, "Data:", data);
  }
}

/**
 * Helper to update progress bars
 */
function updateBar(barEl, textEl, score) {
  const percent = Math.round(score * 100);
  barEl.style.width = percent + "%";
  textEl.textContent = percent + "%";
}

function getSentimentColor(sentiment) {
  if (sentiment === 'positive') return 'var(--accent-green)';
  if (sentiment === 'negative') return 'var(--accent-red)';
  return 'var(--accent-yellow)';
}

function renderEntities(entities) {
    entityContainer.innerHTML = '';
    if (entities.length === 0) {
        entityContainer.innerHTML = '<p class="placeholder-text">No significant entities detected.</p>';
        return;
    }

    entities.slice(0, 15).forEach(ent => {
        const tag = document.createElement('div');
        tag.className = 'entity-tag';
        tag.innerHTML = `
            <span class="entity-text">${ent.text}</span>
            <span class="entity-type">${ent.category}</span>
        `;
        entityContainer.appendChild(tag);
    });
}

function generateProductSummary(phrases, language) {
    if (phrases.length === 0) {
        resSummary.innerHTML = '<p class="placeholder-text">Insufficient data to generate a detailed summary.</p>';
        return;
    }

    // Advanced dynamic summary synthesis
    const primaryTopic = phrases[0].charAt(0).toUpperCase() + phrases[0].slice(1);
    const secondaryTopics = phrases.slice(1, 4).join(', ');
    const allKeywords = phrases.slice(0, 8).join(' • ');

    const summaryHTML = `
        <div class="summary-content">
            <p><strong>Overview:</strong> This content, analyzed in <strong>${language}</strong>, is centered around <em>${primaryTopic}</em>. It highlights key themes such as ${secondaryTopics}.</p>
            <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                <strong>Key Attributes:</strong> ${allKeywords}
            </p>
        </div>
    `;
    
    resSummary.innerHTML = summaryHTML;
}

/**
 * Global Utilities
 */
function toggleLoading(active) {
  loader.classList.toggle('hidden', !active);
  analyzeBtn.disabled = active;
  analyzeBtn.innerHTML = active ?
    `<i class="fas fa-circle-notch fa-spin"></i> Analyzing...` :
    `<i class="fas fa-sparkles"></i> Run Analysis`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('fade-up');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Clear UI
clearBtn.addEventListener('click', () => {
  aiInput.value = "";
  resultsArea.classList.add('hidden');
  aiInput.dispatchEvent(new Event('input'));
  aiInput.focus();
});

// Copy results to clipboard
document.getElementById('copy-btn').addEventListener('click', () => {
  const summary = resSummary.innerText;
  const entities = Array.from(entityContainer.querySelectorAll('.entity-text')).map(e => e.innerText).join(', ');
  
  const output = `--- AI ANALYSIS REPORT ---
Language: ${resLangName.textContent} (${resLangCode.textContent})
Confidence: ${resLangScore.textContent}
Sentiment: ${resSentimentLabel.textContent} (Pos: ${valPos.textContent}, Neg: ${valNeg.textContent})

Summary: 
${summary}

Key Entities:
${entities || 'None detected'}
--------------------------`;

  navigator.clipboard.writeText(output);
  showToast("Full report copied to clipboard!");
});

// Main trigger
analyzeBtn.addEventListener('click', performAnalysis);

// Allow Ctrl+Enter to trigger analysis
aiInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') performAnalysis();
});