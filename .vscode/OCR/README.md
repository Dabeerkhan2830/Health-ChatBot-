# 📑 Azure AI | Invoice OCR Dashboard

Extract printed and handwritten text from images with enterprise-grade precision using **Azure AI Computer Vision**.

## ✨ Features
- **Modern Interface**: Glassmorphism dashboard with dark mode and neon indicators.
- **Handwritten Text Extraction**: Specialized Read API support for high-fidelity OCR of handwritten notes and signatures.
- **Async Processing**: Real-time polling for large image analysis.
- **Secure Credentials**: API Keys are stored locally in your browser's `localStorage`.

## ⚙️ Configuration
1. Open the **OCR Dashboard**.
2. Navigate to **Settings** (Gear icon on the left).
3. Provide your **Azure Endpoint** and **API Key**.
4. Click **Save Credentials**.

## 🚀 Usage
1. Click **Browse File** or drag & drop an invoice image into the upload zone.
2. Review the image in the preview container.
3. Click **Process Invoice** to trigger analysis.
4. Extracted lines will appear in the **Results** panel with line numbering.
5. Use the **Copy (📋)** icon to copy all text to your clipboard.

## 🛠️ Technology Stack
- **HTML5 & CSS3**: Vanilla components with glassmorphism effects.
- **JavaScript**: Asynchronous Fetch API for AI integration.
- **Azure AI Vision**: v3.2/v4.0 Read API.

---
*Created with ❤️ by Antigravity*
