// API configuration
// In production, this should be your Worker URL
// For local dev with wrangler dev, use http://localhost:8787
export const API_BASE = window.location.hostname === 'localhost' 
	? 'http://localhost:8788'
	: window.location.origin;

export const API_URL = `${API_BASE}/api`;

