import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:3333",
                changeOrigin: true
            },
            "/assets": {
                target: "http://localhost:3333",
                changeOrigin: true
            }
        }
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
