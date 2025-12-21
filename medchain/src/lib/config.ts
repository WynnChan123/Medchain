// API Configuration
// Uses environment variable for production, falls back to localhost for development
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
