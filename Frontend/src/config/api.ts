// Dynamic API Configuration for FINTEL AI
// Automatically switches between Cloud and Local depending on environment

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

console.log("🚀 Fintel API Initialized:");
console.log("   - AI Agent:", API_BASE_URL);
console.log("   - Backend Manager:", BACKEND_URL);
