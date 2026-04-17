# VisionIQ | Smart Photo Management

VisionIQ is a premium, cloud-powered photo management application that leverages **Microsoft Azure AI Vision** to automatically organize and enhance your image collection.

## 🚀 Key Features

*   **Automated Face Detection**: Instantly identifies faces within your photos, highlighting them with precise bounding boxes and identifying attributes (age, gender).
*   **Intelligent Image Captioning**: Generates descriptive, human-readable captions for every image using Azure AI's deep learning models.
*   **Smart Tagging**: Automatically extracts keywords and tags to make your gallery searchable and organized.
*   **Premium Design**: Inspired by high-end mobile travel applications, featuring:
    *   Glassmorphism navigation.
    *   Modern typography (Inter & Outfit).
    *   Responsive, card-based layout.
    *   Soft shadows and micro-animations.

## 🛠️ Setup Instructions

1.  **Azure Credentials**: You will need an **Azure Computer Vision** resource.
2.  **Launch**: Open `index.html` in your browser.
3.  **Configure**: On first launch, enter your **Azure API Key** and **Endpoint**.
    *   *Endpoint format: `https://your-resource-name.cognitiveservices.azure.com/`*
4.  **Upload**: Drag and drop any image into the processing area to see the AI magic in action.

## 📂 Project Structure

*   `index.html`: Core structure and semantic HTML5 elements.
*   `style.css`: Premium design system with desktop/mobile responsiveness.
*   `script.js`: Complex logic for Azure AI REST integration and canvas-based face visualization.

## 🔒 Security Note
This application stores your credentials locally in your browser's `localStorage` for convenience. They are never transmitted anywhere except directly to Microsoft's secure Azure endpoints.
