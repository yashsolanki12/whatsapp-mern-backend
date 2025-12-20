// Dynamic allowed origin checker
export function isAllowedOrigin(origin, reqMethod) {
    if (reqMethod && reqMethod.toUpperCase() === "OPTIONS")
        return true;
    if (!origin)
        return true;
    if (/https?:\/\/([\w.-]+)\.myshopify\.com$/.test(origin))
        return true;
    if (origin === "https://admin.shopify.com")
        return true;
    if (origin === "https://shopify-app-with-mern.onrender.com")
        return true;
    if (/https?:\/\/([\w.-]+)\.onrender\.com$/.test(origin))
        return true;
    return false;
}
//# sourceMappingURL=helper.js.map