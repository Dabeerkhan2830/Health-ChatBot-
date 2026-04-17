// Configuration Management
const config = {
    get apiKey() { return localStorage.getItem('AZURE_VISION_KEY') || ''; },
    get endpoint() { 
        let url = localStorage.getItem('AZURE_VISION_ENDPOINT') || '';
        if (url && !url.endsWith('/')) url += '/';
        return url;
    },
    save(key, endpoint) {
        localStorage.setItem('AZURE_VISION_KEY', key);
        localStorage.setItem('AZURE_VISION_ENDPOINT', endpoint);
    },
    get isConfigured() {
        return this.apiKey && this.endpoint;
    }
};

// Tooling for Azure AI Vision REST API
class VisionService {
    static async analyzeImage(imageFile) {
        if (!config.isConfigured) throw new Error('API keys not configured');

        // Note: Computer Vision v3.2 API for faces, descriptions and tags
        const url = `${config.endpoint}vision/v3.2/analyze?visualFeatures=Description,Faces,Tags`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': config.apiKey,
                'Content-Type': 'application/octet-stream'
            },
            body: imageFile
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to analyze image');
        }

        return await response.json();
    }
}

// UI Controller
class App {
    constructor() {
        this.elements = {
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            resultSection: document.getElementById('result-section'),
            previewImg: document.getElementById('preview-img'),
            faceCanvas: document.getElementById('face-canvas'),
            caption: document.getElementById('image-caption'),
            tags: document.getElementById('tags-chips'),
            faceDetails: document.getElementById('face-details'),
            galleryGrid: document.getElementById('gallery-grid'),
            configOverlay: document.getElementById('config-overlay'),
            saveConfig: document.getElementById('save-config'),
            closeResult: document.getElementById('close-result-btn')
        };

        this.gallery = JSON.parse(localStorage.getItem('vision_gallery') || '[]');
        this.init();
    }

    init() {
        // Setup configuration UI
        if (!config.isConfigured) {
            this.elements.configOverlay.style.display = 'flex';
        }

        this.elements.saveConfig.onclick = () => {
            const k = document.getElementById('api-key').value;
            const e = document.getElementById('api-endpoint').value;
            if (k && e) {
                config.save(k, e);
                this.elements.configOverlay.style.display = 'none';
            }
        };

        // File handling
        this.elements.dropZone.onclick = () => this.elements.fileInput.click();
        this.elements.fileInput.onchange = (e) => this.handleFile(e.target.files[0]);
        this.elements.closeResult.onclick = () => {
            this.elements.resultSection.style.display = 'none';
        };

        // Drag and drop
        this.elements.dropZone.ondragover = (e) => { e.preventDefault(); this.elements.dropZone.style.borderColor = 'var(--primary)'; };
        this.elements.dropZone.ondragleave = () => { this.elements.dropZone.style.borderColor = 'rgba(0,0,0,0.06)'; };
        this.elements.dropZone.ondrop = (e) => {
            e.preventDefault();
            this.elements.dropZone.style.borderColor = 'rgba(0,0,0,0.06)';
            this.handleFile(e.dataTransfer.files[0]);
        };

        this.renderGallery();
    }

    async handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        // Reset UI
        this.elements.resultSection.style.display = 'block';
        this.elements.caption.textContent = 'Intelligent processing...';
        this.elements.tags.innerHTML = '';
        this.elements.faceDetails.innerHTML = '';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.previewImg.src = e.target.result;
            this.clearCanvas();
        };
        reader.readAsDataURL(file);

        try {
            const data = await VisionService.analyzeImage(file);
            this.renderAnalysis(data);
            this.saveToGallery(data, file);
        } catch (error) {
            this.elements.caption.textContent = `Error: ${error.message}`;
            console.error(error);
        }
    }

    renderAnalysis(data) {
        // 1. Caption
        const captionText = data.description?.captions?.[0]?.text || "Interesting visual detected";
        this.elements.caption.textContent = captionText.charAt(0).toUpperCase() + captionText.slice(1);

        // 2. Tags
        data.tags?.slice(0, 5).forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag';
            chip.textContent = `#${tag.name}`;
            this.elements.tags.appendChild(chip);
        });

        // 3. Faces & Drawing
        const faces = data.faces || [];
        this.elements.faceDetails.textContent = faces.length > 0 
            ? `Detected ${faces.length} face${faces.length > 1 ? 's' : ''} with attributes.`
            : 'No faces detected in this shot.';

        this.drawFaces(faces);
    }

    drawFaces(faces) {
        const img = this.elements.previewImg;
        const canvas = this.elements.faceCanvas;
        
        // Match canvas to displayed image dimensions
        setTimeout(() => {
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#5E5CE6';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';

            const scaleX = img.clientWidth / img.naturalWidth;
            const scaleY = img.clientHeight / img.naturalHeight;

            faces.forEach(face => {
                const rect = face.faceRectangle;
                ctx.strokeRect(
                    rect.left * scaleX, 
                    rect.top * scaleY, 
                    rect.width * scaleX, 
                    rect.height * scaleY
                );
                
                // Add label
                ctx.fillStyle = '#5E5CE6';
                ctx.font = 'bold 12px Inter';
                ctx.fillText(`${face.gender}, ${face.age}`, rect.left * scaleX, (rect.top * scaleY) - 5);
            });
        }, 300); // Wait for image layout
    }

    clearCanvas() {
        const ctx = this.elements.faceCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.elements.faceCanvas.width, this.elements.faceCanvas.height);
    }

    saveToGallery(data, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = {
                id: Date.now(),
                img: e.target.result,
                caption: data.description?.captions?.[0]?.text || "Saved memory",
                tags: data.tags?.slice(0, 3).map(t => t.name) || []
            };
            this.gallery.unshift(item);
            if (this.gallery.length > 10) this.gallery.pop(); // Keep it light
            localStorage.setItem('vision_gallery', JSON.stringify(this.gallery));
            this.renderGallery();
        };
        reader.readAsDataURL(file);
    }

    renderGallery() {
        if (this.gallery.length === 0) return;
        
        this.elements.galleryGrid.innerHTML = '';
        this.gallery.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.img}" alt="Gallery Item">
                <div class="gallery-item-info">
                    <p class="gallery-item-title">${item.caption}</p>
                    <div class="tags-container small">
                        ${item.tags.map(t => `<small class="tag-small">#${t}</small>`).join(' ')}
                    </div>
                </div>
            `;
            this.elements.galleryGrid.appendChild(div);
        });
    }
}

// Start the app
window.onload = () => new App();
