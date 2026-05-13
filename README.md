# 🏥 KWS Health Chatbot — AI-Powered Medical Assistant

> **Khan Web Service (KWS)** | Enterprise Medical AI Playground

An enterprise-grade, multimodal AI health chatbot powered by **Azure OpenAI**. This application provides an interactive diagnostic assistant capable of analyzing clinical text, summarizing symptoms, and interpreting visual medical data such as X-rays, MRI scans, and charts — all within a secure, browser-based sandbox.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Azure](https://img.shields.io/badge/powered%20by-Azure%20OpenAI-0078D4)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Neural Chat** | Conversational AI assistant for health-related queries with context-aware responses |
| 🖼️ **Vision Diagnostics** | Upload and analyze medical images (X-rays, MRI scans, charts) using multimodal AI |
| 🔐 **Secure Configuration** | API credentials are encrypted and stored locally in the browser — never sent to third parties |
| 🔗 **Connection Tester** | Built-in endpoint tester to validate your Azure OpenAI connection before use |
| 📱 **Responsive Design** | Fully responsive UI that works seamlessly across desktop and mobile devices |
| ⚡ **Real-time Inference** | Live typing indicators and smooth animations during AI response generation |

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **AI Backend:** [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service) (GPT-4o / GPT-4 Vision)
- **Fonts:** [Google Fonts — Open Sans](https://fonts.google.com/specimen/Open+Sans)
- **Icons:** [Font Awesome 6](https://fontawesome.com/)

---

## 🚀 Getting Started

### Prerequisites

- An active **Azure OpenAI** resource with a deployed model (e.g., `gpt-4o`)
- A modern web browser (Chrome, Edge, Firefox, Safari)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dabeerkhan2830/azure_translator.git
   cd HealthChat_bot
   ```

2. **Open the application:**
   Simply open `index.html` in your browser, or use a local development server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js (live-server)
   npx live-server
   ```

3. **Configure your Azure credentials:**
   - Click the **⚕️ API Config** button in the navbar
   - Enter your **Endpoint URL**, **API Key**, **Deployment Name**, and **API Version**
   - Click **Test Connection** to verify, then **Secure & Save Configuration**

---

## 📁 Project Structure

```
HealthChat_bot/
├── index.html          # Main HTML structure and layout
├── style.css           # Complete styling (dark theme, animations, responsive)
├── text.js             # Application logic (chat, Azure API, file handling)
├── medical_ai_bg.png   # Hero section background image
└── README.md           # Project documentation (this file)
```

---

## ⚙️ Configuration

The app connects to Azure OpenAI via the built-in settings modal. You'll need:

| Field | Description | Example |
|---|---|---|
| **Endpoint URL** | Your Azure OpenAI resource endpoint | `https://my-resource.openai.azure.com/` |
| **API Key** | 32-character hex API key | `abc123def456...` |
| **Deployment Name** | Name of your deployed model | `gpt-4o` |
| **API Version** | Azure OpenAI API version | `2024-02-15-preview` |

> [!NOTE]
> Credentials are stored in your browser's `localStorage` and are never transmitted to any external server beyond Azure.

---

## 💡 Usage

### Text-Based Chat
Type your health-related question into the input field and click **Run Inference** (or press `Enter`). The AI will respond with helpful, empathetic, and factual medical insights.

### Image Analysis (Vision Diagnostics)
1. Click the 📎 **attachment button** to upload a medical image (PNG, JPEG, or WebP)
2. Optionally add a text prompt describing what you want analyzed
3. Click **Run Inference** — the AI will interpret the visual data and provide analysis

---

## ⚠️ Disclaimer

> [!CAUTION]
> This application is a **strictly non-medical AI demonstration**. It is not a substitute for professional medical advice, diagnosis, or treatment. **Do not input real PII/PHI (Personal Identifiable Information / Protected Health Information).** Generated insights must **not** be used for actual medical diagnosis.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](../LICENSE) file for details.

---

## 👤 Author

**Khan Web Service (Dabeer Khan)**
© 2026, Khan Web Service, Inc. — Accelerating Medical Technology.

---

<p align="center">
  Made with ❤️ using Azure AI
</p>
