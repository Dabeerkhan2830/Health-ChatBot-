/**
 * Azure AI Sentinel: Cyber Intelligence Console Engine
 */

class AISentinel {
    constructor() {
        this.sessionHistory = JSON.parse(localStorage.getItem('sentinel_sessions')) || [];
        this.chart = null;
        this.initEventListeners();
        this.renderHistory();
        this.initNeonChart();
    }

    initEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.onclick = () => fileInput.click();
        
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('dragging');
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) this.processDocument(file);
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.processDocument(file);
        };

        const simBtn = document.getElementById('simBtn');
        if (simBtn) simBtn.onclick = () => this.triggerSimulation();
    }

    triggerSimulation() {
        // Mock a "High Risk" text block with explicit flagged segments
        const mockText = "DETECTION BUFFER: Initiating protocol 99. The entity contains several [REDACTED] sequences and references to unauthorized chemical synthesizing methods. Extraction confidence is degraded due to non-standard character sets.";
        const mockSafety = {
            categoriesAnalysis: [
                { category: 'Hate', severity: 0 },
                { category: 'Self-Harm', severity: 0 },
                { category: 'Sexual', severity: 0 },
                { category: 'Violence', severity: 6 }
            ],
            flaggedText: ["unauthorized chemical synthesizing"]
        };

        this.updateStatus("RUNNING RISK SIMULATION...", 30);
        this.updateUIWithExtraction(mockText, 0.58); // Low confidence triggers high bias

        setTimeout(() => {
            this.finalAnalysis(mockSafety, 0.58, mockText, "THREAT_ANALYSIS_01.DOC");
        }, 1200);
    }

    async processDocument(file) {
        const docKey = document.getElementById('docKey').value;
        const docEndpoint = document.getElementById('docEndpoint').value.replace(/\/$/, "");
        const safetyKey = document.getElementById('safetyKey').value;

        if (!docKey || !docEndpoint || !safetyKey) {
            alert("Credentials Required: Enter Azure keys in the sidebar.");
            return;
        }

        const startTime = Date.now();
        this.updateStatus("INGESTING DATA SOURCE...", 20);
        
        try {
            // STEP 1: OCR Extraction
            const extractionResult = await this.performExtraction(file, docEndpoint, docKey);
            const extractedText = extractionResult.pages.map(p => p.lines.map(l => l.content).join(" ")).join("\n");
            const meanConfidence = extractionResult.pages[0].words.reduce((acc, w) => acc + w.confidence, 0) / extractionResult.pages[0].words.length;

            this.updateUIWithExtraction(extractedText, meanConfidence);
            this.updateLatency(startTime);
            this.updateStatus("POLICY COMPLIANCE SCAN...", 60);

            // STEP 2: Safety Analysis
            const safetyAnalysis = await this.performSafetyAnalysis(extractedText, safetyKey);
            
            // STEP 3: Aggregate Intelligence
            this.finalAnalysis(safetyAnalysis, meanConfidence, extractedText, file.name);
            this.updateLatency(startTime);
            
        } catch (error) {
            console.error(error);
            this.updateStatus("SYSTEM FAULT DETECTED", 0, true);
        }
    }

    async performExtraction(file, endpoint, key) {
        const modelId = "prebuilt-layout";
        const url = `${endpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2023-07-31`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/octet-stream' },
            body: file
        });

        if (!response.ok) throw new Error("Azure Service Unreachable");

        const operationLocation = response.headers.get('Operation-Location');
        
        while (true) {
            const pollRes = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
            const data = await pollRes.json();
            if (data.status === "succeeded") return data.analyzeResult;
            if (data.status === "failed") throw new Error("Processing Error");
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    async performSafetyAnalysis(text, key) {
        // Updated to generic endpoint - user should replace based on their region
        const endpoint = "https://eastus.api.cognitive.microsoft.com/contentsafety/text:analyze?api-version=2023-10-01";
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.substring(0, 1000) })
        });
        
        return await response.json();
    }

    finalAnalysis(safety, confidence, rawText, filename) {
        this.updateStatus("CORRELATING THREAT DATA...", 90);

        // Adaptive Risk Scaling
        const riskBias = confidence < 0.7 ? 1.5 : 1.0; 
        const categories = safety.categoriesAnalysis || [];
        const riskScores = categories.map(c => Math.min(10, c.severity * riskBias * 1.5));
        const maxRisk = Math.max(...riskScores);

        // UI Transformation
        this.updateNeonChart(riskScores);
        this.renderPolishedAnomalyList(categories, confidence, safety);
        
        const riskLevel = maxRisk > 6 ? "CRITICAL" : (maxRisk > 2 ? "WARNING" : "SECURE");
        const riskPill = document.getElementById('riskLevel');
        riskPill.textContent = riskLevel;
        riskPill.className = `risk-pill ${riskLevel.toLowerCase() === 'secure' ? 'low' : 'high'}`;

        // Session Persistence
        const session = {
            id: Date.now(),
            filename,
            risk: riskLevel,
            confidence: (confidence * 100).toFixed(1) + "%",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.sessionHistory.unshift(session);
        this.saveHistory();
        this.renderHistory();

        this.updateStatus("ANALYSIS SYNCHRONIZED", 100);
        setTimeout(() => document.getElementById('progressBar').classList.add('hidden'), 3000);
    }

    initNeonChart() {
        const ctx = document.getElementById('riskChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Hate', 'Self-Harm', 'Sexual', 'Violence'],
                datasets: [{
                    label: 'Threat Intensity',
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#94a3b8', font: { size: 10, weight: 'bold' } },
                        ticks: { display: false, stepSize: 2 },
                        suggestedMin: 0,
                        suggestedMax: 10
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    updateNeonChart(scores) {
        this.chart.data.datasets[0].data = scores;
        this.chart.update();
    }

    renderPolishedAnomalyList(categories, confidence, safety) {
        const container = document.getElementById('anomalyList');
        container.innerHTML = '';

        const activeRisks = categories.filter(c => c.severity > 0);
        
        if (activeRisks.length === 0) {
            container.innerHTML = '<p class="placeholder-text">NO THREAT PATTERNS IDENTIFIED IN DATA BUFFERS</p>';
            return;
        }

        activeRisks.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'anomaly-card';
            const flagged = (safety && safety.flaggedText) ? safety.flaggedText.join(", ") : "Contextual Obfuscation";
            
            item.innerHTML = `
                <div class="anomaly-icon pulse">!</div>
                <div class="anomaly-content">
                    <h4>${cat.category.toUpperCase()} POLICY BREACH</h4>
                    <p><strong>Flagged:</strong> <span class="danger-text">${flagged}</span></p>
                    <p class="meta-p">Magnitude: ${cat.severity} | Risk Factor: ${confidence < 0.6 ? 'Low-Confidence Ambiguity' : 'Direct Intent'}</p>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateStatus(msg, progress, isError = false) {
        const bar = document.getElementById('progressBar');
        const fill = bar.querySelector('.progress-fill');
        const text = document.getElementById('progressText');
        
        bar.classList.remove('hidden');
        text.textContent = msg;
        fill.style.width = `${progress}%`;
        
        if (isError) {
            fill.style.background = 'var(--danger)';
            fill.style.boxShadow = '0 0 20px var(--danger)';
        } else {
            fill.style.background = 'var(--accent)';
        }
    }

    updateUIWithExtraction(text, confidence) {
        const codeView = document.getElementById('extractedText');
        codeView.textContent = text ? text : 'NULL_CONTENT_BLOCK';
        const pill = document.getElementById('extractionConfidence');
        pill.textContent = (confidence * 100).toFixed(1) + "%";
        pill.classList.toggle('risk-high', confidence < 0.7);
    }

    updateLatency(startTime) {
        const latency = Date.now() - startTime;
        document.getElementById('latency').textContent = latency + "ms";
    }

    saveHistory() {
        localStorage.setItem('sentinel_sessions', JSON.stringify(this.sessionHistory.slice(0, 5)));
    }

    renderHistory() {
        const container = document.getElementById('sessionLog');
        if (this.sessionHistory.length === 0) {
            container.innerHTML = '<p class="empty-hint">Standby for data ingestion...</p>';
            return;
        }
        
        container.innerHTML = this.sessionHistory.map(s => `
            <div class="log-item">
                <div class="log-info">
                    <span class="log-file">${s.filename.substring(0, 15)}...</span>
                    <span class="log-time">${s.timestamp}</span>
                </div>
                <div class="log-metrics">
                    <span class="badge-mini">${s.risk}</span>
                    <span class="badge-mini">${s.confidence}</span>
                </div>
            </div>
        `).join('');
    }
}

// Global Init
window.onload = () => {
    window.App = new AISentinel();
};
