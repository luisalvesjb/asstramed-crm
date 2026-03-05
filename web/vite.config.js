import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-antd": ["antd"],
                    "vendor-state": ["@reduxjs/toolkit", "react-redux"],
                    "vendor-editor": ["react-quill"],
                    "vendor-cropper": ["react-easy-crop"]
                }
            }
        }
    }
});
