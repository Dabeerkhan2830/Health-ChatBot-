// This file is reserved for any static global configurations
// Currently, API keys are managed dynamically via the UI and stored in localStorage
// to maintain a secure and modular approach.

const APP_SETTINGS = {
    version: "1.2.0",
    theme: "light-premium",
    services: {
        vision: {
            apiVersion: "v3.2",
            features: ["Description", "Faces", "Tags"]
        }
    }
};
console.log("VisionIQ Configuration Loaded.");
