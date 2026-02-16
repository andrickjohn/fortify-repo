import { Resend } from 'resend';

// Initialize Resend with the API key or a placeholder to prevent build-time crashes.
// The actual API call will fail gracefully at runtime if the key is invalid.
export const resend = new Resend(process.env.RESEND_API_KEY || 're_missing_key');
