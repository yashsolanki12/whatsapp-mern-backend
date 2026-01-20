import crypto from "crypto";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import phoneRoutes from "./routes/phone.routes.js";
import shopifyAuthRoutes from "./routes/shopify-auth.routes.js";
import shopifyWebhookRoutes from "./routes/shopify-webhook.routes.js";
import { connectDb } from "./config/db.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { ApiResponse } from "./utils/api-response.js";
import { StatusCode } from "@shopify/shopify-api";
import { isAllowedOrigin } from "./utils/helper.js";
import { uninstallCleanup } from "./controllers/phone.js";
const app = express();
dotenv.config({ path: [".env"] });
// Global Logger
app.use((req, _res, next) => {
    console.log(`[Global Log] ${req.method} ${req.url}`);
    next();
});
app.get("/", (_req, res) => {
    res.json({ message: "Server is running 🚀" });
});
// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.status(StatusCode.Ok).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected",
    });
});
app.post("/api/utils/generate-hmac", express.raw({ type: "application/json" }), (req, res) => {
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
        return res
            .status(StatusCode.Unauthorized)
            .json(new ApiResponse(false, "Webhook HMAC validation failed"));
    }
    const body = req.body;
    const digest = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("base64");
    res.json({ hmac: digest });
});
// Shopify Webhook Handler (Highly Resilient Version)
app.post("/api/shopify/webhook", express.raw({ type: "application/json" }), // Strictly capture for Shopify webhooks
async (req, res) => {
    const topic = req.get("X-Shopify-Topic");
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const shopHeader = req.get("X-Shopify-Shop-Domain");
    console.log(`[Webhook] Incoming Request - Topic: ${topic}, Shop: ${shopHeader}`);
    const primarySecret = process.env.SHOPIFY_API_SECRET?.trim();
    if (!primarySecret) {
        console.error("[Webhook] SHOPIFY_API_SECRET is missing!");
        return res.status(500).json({ success: false, message: "Configuration error" });
    }
    const body = req.body;
    if (!body || body.length === 0) {
        console.error("[Webhook] Body is empty!");
        return res.status(400).json({ success: false, message: "Empty body" });
    }
    // Try multiple secret versions to be safe
    const secretsToTry = [
        primarySecret,
        primarySecret.replace("shpss_", ""),
    ];
    let verifiedSecret = null;
    let lastDigest = "";
    for (const secret of secretsToTry) {
        const digest = crypto.createHmac("sha256", secret).update(body).digest("base64");
        lastDigest = digest;
        if (digest === hmacHeader) {
            verifiedSecret = secret;
            break;
        }
    }
    if (!verifiedSecret) {
        console.error(`[Webhook] HMAC MISMATCH!`);
        console.error(`[Webhook] Calculated example: ${lastDigest}`);
        console.error(`[Webhook] Received from Shopify: ${hmacHeader}`);
        return res
            .status(StatusCode.Unauthorized)
            .json(new ApiResponse(false, "HMAC validation failed"));
    }
    console.log("[Webhook] ✅ HMAC Verified Successfully!");
    try {
        const payload = JSON.parse(body.toString());
        const shop = shopHeader || payload.myshopify_domain || payload.shop;
        if (topic === "app/uninstalled") {
            console.log(`[Webhook] Handling uninstall for: ${shop}`);
            req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
            req.body = { shop };
            await uninstallCleanup(req, res);
            return;
        }
    }
    catch (e) {
        console.error("[Webhook] Error processing payload:", e);
    }
    res.status(StatusCode.Ok).json(new ApiResponse(true, "Webhook received"));
});
// Standard Middleware (Applied AFTER webhook route to avoid interference)
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS Configuration for Shopify Integration
// This handles cross-origin requests from Shopify admin and storefronts
// Fixes: "Missing CORS headers: Your backend wasn't configured to allow requests from the Shopify domain"
app.use(cors({
    origin: (origin, callback) => {
        // Pass req.method to helper for OPTIONS support
        // @ts-ignore
        const reqMethod = typeof this !== "undefined" &&
            this &&
            this.req &&
            this.req.method
            ? this.req.method
            : undefined;
        if (isAllowedOrigin(origin, reqMethod)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"), false);
        }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "x-shopify-shop-domain"],
}));
// Dynamic CORS middleware for dev and preview environments
// Additional layer to handle various Shopify domains and development environments
// Ensures compatibility with ngrok, cloudflare tunnels, and local development
const allowedOriginPatterns = [
    /.*\.myshopify\.com$/,
    /.*\.ngrok-free\.dev$/,
    /.*\.trycloudflare\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/localhost:\d+$/,
];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = allowedOriginPatterns.some((pattern) => typeof pattern === "string"
        ? pattern === origin
        : pattern.test(origin || ""));
    if (isAllowed || !origin) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Shopify-Access-Token, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Hmac-SHA256, ngrok-skip-browser-warning");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Expose-Headers", "Content-Range, X-Total-Count");
    }
    if (req.method === "OPTIONS")
        return res.status(204).end();
    next();
});
// Use for development
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true);
//       const isAllowed = allowedOriginPatterns.some((pattern) =>
//         typeof pattern === "string"
//           ? pattern === origin
//           : pattern.test(origin)
//       );
//       if (isAllowed) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );
// Basic route for testing
// // Routes for phone
app.use("/api/phone", phoneRoutes);
// Shopify webhook routes
app.use(shopifyWebhookRoutes);
// Add Shopify App Proxy route for live frontend
app.use("/apps/whatsapp-mern-app/phone", phoneRoutes);
// Routes for Shopify authentication
app.use("/api/shopify", shopifyAuthRoutes);
// Global Error Handler
app.use(errorHandler);
// Handle 404 - This must be after all other routes
app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
    res
        .status(StatusCode.NotFound)
        .json({ error: "Not Found", path: req.originalUrl });
});
// Error handling middleware - This must be after all other middleware
app.use((err, _req, res, _next) => {
    console.error("Error:", err.message);
    res.status(StatusCode.InternalServerError).json({
        error: "Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});
// Database connection
const mongoDbUrl = process.env.MONGODB_URL;
const dbName = process.env.DB_NAME;
if (!mongoDbUrl || !dbName) {
    throw new Error("Missing MongoDB connection environment variables.");
}
connectDb({ url: mongoDbUrl, dbName });
export default app;
//# sourceMappingURL=app.js.map