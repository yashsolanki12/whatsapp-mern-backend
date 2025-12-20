// Dynamic allowed origin checker
export function isAllowedOrigin(origin, reqMethod) {
    if (!origin)
        return true;
    if (reqMethod && reqMethod.toUpperCase() === "OPTIONS")
        return true;
    // allowed origin list
    if (/https?:\/\/([\w.-]+)\.myshopify\.com$/.test(origin))
        return true;
    if (origin === "https://admin.shopify.com")
        return true;
    if (origin === "https://shopify-app-with-mern.onrender.com")
        return true;
    if (/https?:\/\/([\w.-]+)\.onrender\.com$/.test(origin))
        return true;
    if (/^http:\/\/localhost:\d+$/.test(origin))
        return true;
    if (/.*\.trycloudflare\.com$/.test(origin))
        return true;
    if (/^https:\/\/admin\.shopify\.com$/.test(origin))
        return true;
    return false;
}
//# sourceMappingURL=helper.js.map