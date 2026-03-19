// Dynamic allowed origin checker
// Handles CORS for Shopify domains to prevent:
// "Missing CORS headers: Your backend wasn't configured to allow requests from the Shopify domain"
export function isAllowedOrigin(origin?: string, reqMethod?: string): boolean {
  if (!origin) return true;
  if (reqMethod && reqMethod.toUpperCase() === "OPTIONS") return true;

  // Define only specific trusted domains
  const allowedOrigins = [
    "http://ecswhatsup.ecodesoft.net",
    "https://ecswhatsup-backend.ecodesoft.net",
  ];

  if (allowedOrigins.includes(origin)) return true;

  // Backend url
  if (/^https?:\/\/([\w.-]+)\.ecodesoft\.net$/.test(origin)) return true;

  // Shopify-specific domain patterns
  if (/https?:\/\/([\w.-]+)\.myshopify\.com$/.test(origin)) return true; // Store domains
  if (/https?:\/\/([\w.-]+)\.shopify\.com$/.test(origin)) return true; // Admin domains

  // Development and deployment domains
  if (/https?:\/\/([\w.-]+)\.onrender\.com$/.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/.*\.trycloudflare\.com$/.test(origin)) return true;

  // Allow ALL Shopify store custom domains (including web pixels, themes, apps)
  // This handles: healthyhub.ca, mystore.com, etc. for Shopify stores
  // Pattern: matches any HTTPS domain that could be a Shopify store
  if (/^https:\/\/[\w.-]+$/.test(origin)) return true;

  return false;
}
