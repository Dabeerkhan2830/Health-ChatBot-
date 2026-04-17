/**
 * Azure Translator Pro - Extreme Edition
 * Feature-rich, 3D modular architecture
 */

// Global Configuration
const CONFIG = {
    API_KEY: "YOUR_AZURE_API_KEY",
    REGION: "centralindia",
    ENDPOINT: "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0",
    THEMES: {
        azure: { nexus: 0x6366f1, particles: 0x4f46e5, primary: "#6366f1" },
        emerald: { nexus: 0x10b981, particles: 0x059669, primary: "#10b981" },
        rose: { nexus: 0xf43f5e, particles: 0xe11d48, primary: "#f43f5e" }
    }
};

/**
 * 3D Scene Controller (Three.js)
 */
class Nexus3D {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.particles = null;
        this.nexus = null;
        this.currentTheme = 'azure';
        
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 1. Particle Lattice
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for (let i = 0; i < 3000; i++) {
            pos.push((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ size: 1.5, color: CONFIG.THEMES.azure.particles, transparent: true, opacity: 0.4 });
        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);

        // 2. Central Nexus Core
        const nexusGeo = new THREE.IcosahedronGeometry(1.8, 1);
        const nexusMat = new THREE.MeshPhongMaterial({ color: CONFIG.THEMES.azure.nexus, wireframe: true, transparent: true, opacity: 0.8 });
        this.nexus = new THREE.Mesh(nexusGeo, nexusMat);
        this.scene.add(this.nexus);

        // 3. Environment
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pLight = new THREE.PointLight(0xffffff, 1);
        pLight.position.set(10, 10, 10);
        this.scene.add(pLight);

        this.camera.position.z = 6;
        this.animate();
    }

    setTheme(themeName) {
        const theme = CONFIG.THEMES[themeName];
        this.nexus.material.color.setHex(theme.nexus);
        this.particles.material.color.setHex(theme.particles);
        document.documentElement.style.setProperty('--primary', theme.primary);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.nexus.rotation.y += 0.005;
        this.nexus.rotation.x += 0.002;
        this.particles.rotation.y += 0.0003;
        
        const time = Date.now() * 0.001;
        this.nexus.scale.setScalar(1 + Math.sin(time) * 0.1);
        
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

/**
 * Speech Recognition Engine
 */
class SpeechEngine {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            this.recognition.onstart = () => this.onStart();
            this.recognition.onend = () => this.onEnd();
            this.recognition.onresult = (e) => this.onResult(e);
        }
    }

    start() {
        if (!this.recognition) return alert("STT not supported in this browser.");
        this.isRecording ? this.recognition.stop() : this.recognition.start();
    }

    onStart() {
        this.isRecording = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voiceBtn').querySelector('span').innerText = "Stop";
    }

    onEnd() {
        this.isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').querySelector('span').innerText = "Listen";
    }

    onResult(event) {
        const text = event.results[0][0].transcript;
        document.getElementById('inputText').value = text;
    }
}

/**
 * Main Application Logic
 */
class TranslatorApp {
    constructor() {
        this.nexus = new Nexus3D();
        this.speech = new SpeechEngine();
        this.history = JSON.parse(localStorage.getItem('transHistory') || '[]');
        
        this.initEvents();
        this.renderHistory();
    }

    initEvents() {
        // Resize
        window.addEventListener('resize', () => this.nexus.onResize());

        // Mouse Move Effects
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX - window.innerWidth / 2) / 1000;
            const y = (e.clientY - window.innerHeight / 2) / 1000;
            this.nexus.camera.position.x += (x - this.nexus.camera.position.x) * 0.1;
            this.nexus.camera.position.y += (-y - this.nexus.camera.position.y) * 0.1;
            this.nexus.camera.lookAt(this.nexus.scene.position);

            // Container Glow
            const rect = document.querySelector('.container').getBoundingClientRect();
            const gx = ((e.clientX - rect.left) / rect.width) * 100;
            const gy = ((e.clientY - rect.top) / rect.height) * 100;
            document.querySelector('.container').style.setProperty('--x', `${gx}%`);
            document.querySelector('.container').style.setProperty('--y', `${gy}%`);
        });

        // Theme Switcher
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelector('.theme-option.active').classList.remove('active');
                opt.classList.add('active');
                this.nexus.setTheme(opt.dataset.theme);
            });
        });
    }

    async translate() {
        const text = document.getElementById("inputText").value;
        const targetLang = document.getElementById("targetLang").value;
        const btn = document.querySelector(".controls button");
        const output = document.getElementById("outputText");

        if (!text) return alert("Enter text!");

        btn.disabled = true;
        btn.innerHTML = '<span>Translating...</span>';
        output.style.opacity = "0.5";

        try {
            const res = await fetch(`${CONFIG.ENDPOINT}&to=${targetLang}`, {
                method: "POST",
                headers: {
                    "Ocp-Apim-Subscription-Key": CONFIG.API_KEY,
                    "Ocp-Apim-Subscription-Region": CONFIG.REGION,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify([{ "text": text }])
            });

            if (!res.ok) throw new Error("API Limit reached or key invalid");
            
            const data = await res.json();
            const resultText = data[0].translations[0].text;
            
            output.innerText = resultText;
            output.style.opacity = "1";
            
            this.saveToHistory(text, resultText);

        } catch (err) {
            output.innerText = `System Error: ${err.message}`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span>Translate</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>`;
        }
    }

    saveToHistory(source, result) {
        this.history.unshift({ source, result, time: new Date().toLocaleTimeString() });
        this.history = this.history.slice(0, 5);
        localStorage.setItem('transHistory', JSON.stringify(this.history));
        this.renderHistory();
    }

    renderHistory() {
        const list = document.getElementById('historyList');
        if (this.history.length === 0) return;
        
        list.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div style="color: var(--primary); font-weight: 600;">${item.source}</div>
                <div style="opacity: 0.7; margin-top: 0.3rem;">${item.result}</div>
            </div>
        `).join('');
    }

    speak() {
        const text = document.getElementById("outputText").innerText;
        if (!text || text.includes("...")) return;
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = document.getElementById("targetLang").value;
        window.speechSynthesis.speak(speech);
    }

    copy() {
        const text = document.getElementById("outputText").innerText;
        navigator.clipboard.writeText(text);
        const btn = document.querySelector('.icon-btn[title="Copy to Clipboard"]');
        btn.innerHTML = '✅';
        setTimeout(() => btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>', 1000);
    }
}

// Global instance
const app = new TranslatorApp();

// Link global functions for HTML access
window.translateText = () => app.translate();
window.startSpeechRecognition = () => app.speech.start();
window.speakTranslation = () => app.speak();
window.copyTranslation = () => app.copy();
