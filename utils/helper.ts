// Dynamic allowed origin checker
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  // Allow any .myshopify.com domain
  if (/https?:\/\/([\w.-]+)\.myshopify\.com$/.test(origin)) return true;
  // Allow Shopify admin
  if (origin === "https://admin.shopify.com") return true;
  // Allow your production app domain
  if (origin === "https://shopify-app-with-mern.onrender.com") return true;
  return false;
}
