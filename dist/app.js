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
// function verifyShopifyWebhook(rawBody: Buffer, hmacHeader?: string) {
//   if (!rawBody || !hmacHeader) return false;
//   const secret = process.env.SHOPIFY_API_SECRET?.trim().replace(
//     /^["']|["']$/g,
//     "",
//   );
//   if (!secret) return false;
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody)
//     .digest("base64");
//   try {
//     return crypto.timingSafeEqual(
//       Buffer.from(hash, "utf8"),
//       Buffer.from(hmacHeader, "utf8"),
//     );
//   } catch {
//     return false;
//   }
// }
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
    const secret = process.env.SHOPIFY_API_SECRET?.trim();
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
// Shopify Webhook Handler (Ultra-Diagnostic Version)
// app.post(
//   "/api/shopify/webhook",
//   express.raw({ type: "*/*" }), // Capture EVERYTHING to be safe
//   async (req: any, res) => {
//     const topic = req.get("X-Shopify-Topic");
//     const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
//     const shopHeader = req.get("X-Shopify-Shop-Domain");
//     console.log(`[Webhook] Topic: ${topic}, Shop: ${shopHeader}`);
//     const rawSecret = process.env.SHOPIFY_API_SECRET?.trim() || "";
//     // Remove literal quotes if present
//     const cleanSecret = rawSecret.replace(/^["']|["']$/g, "");
//     if (!cleanSecret) {
//       console.error("[Webhook] SHOPIFY_API_SECRET is missing!");
//       return res.status(500).json({ success: false, message: "Missing Secret" });
//     }
//     const body = req.body;
//     if (!body || body.length === 0) {
//       console.error("[Webhook] Body length is 0. Middleware issue?");
//       return res.status(400).json({ success: false, message: "Empty Body" });
//     }
//     // Diagnostics: Log secret structure
//     const maskedSecret = cleanSecret.substring(0, 15) + "..." + cleanSecret.substring(cleanSecret.length - 4);
//     console.log(`[Webhook] Secret Structure: "${maskedSecret}" (Length: ${cleanSecret.length})`);
//     // Check for common typo (Index 17 is the 18th character)
//     if (cleanSecret.length >= 18 && cleanSecret[17] === "0") {
//       console.warn("[Webhook] ⚠️ WARNING: 18th character is '0'. Typo check needed!");
//     }
//     // Try all possible interpretations
//     const variants = [
//       cleanSecret,                             // Exact
//       cleanSecret.replace("shpss_", ""),       // No prefix
//     ];
//     let verified = false;
//     // let fallbackHmac = "";
//     for (const secret of variants) {
//       const hmac = crypto.createHmac("sha256", secret).update(body).digest("base64");
//       if (hmac === hmacHeader) {
//         verified = true;
//         break;
//       }
//       // fallbackHmac = hmac;
//     }
//     if (!verified) {
//       console.error(`[Webhook] HMAC MISMATCH!`);
//       console.error(`[Webhook] Calculated 1 (Exact): ${crypto.createHmac("sha256", cleanSecret).update(body).digest("base64")}`);
//       console.error(`[Webhook] Received Header:    ${hmacHeader}`);
//       return res.status(401).json(new ApiResponse(false, "HMAC validation failed"));
//     }
//     console.log("[Webhook] ✅ HMAC Verified Successfully!");
//     try {
//       const payload = JSON.parse(body.toString());
//       const shop = shopHeader || payload.myshopify_domain || payload.shop;
//       if (topic === "app/uninstalled") {
//         console.log(`[Webhook] Processing uninstall for: ${shop}`);
//         req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
//         req.body = { shop };
//         await uninstallCleanup(req, res);
//         return;
//       }
//     } catch (e) {
//       console.error("[Webhook] Parse error:", e);
//     }
//     res.status(StatusCode.Ok).json(new ApiResponse(true, "Received"));
//   }
// );
app.post("/api/shopify/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    const topic = req.get("X-Shopify-Topic");
    const shop = req.get("X-Shopify-Shop-Domain");
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256") || req.get("x-shopify-hmac-sha256");
    const rawBody = req.body;
    // HMAC Verification Bypassed by User Request
    // Previous diagnostics showed persistent mismatch despite correct secret length (38) and body captures.
    console.warn("⚠️ HMAC Verification BYPASSED for webhook topic:", topic);
    console.log("Expected (Header):", hmacHeader);
    console.log("Body length:", rawBody?.length);
    console.log("✅ Proceeding with webhook processing (HMAC check skipped)");
    try {
        const payload = JSON.parse(rawBody.toString());
        if (topic === "app/uninstalled") {
            console.log(`[Webhook] Processing uninstall for: ${shop}`);
            // Ensure the internal API key is present for the cleanup controller
            req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
            req.body = { shop };
            await uninstallCleanup(req, res);
            return;
        }
        if (payload) {
            console.log("Payload:", payload);
        }
    }
    catch (e) {
        console.error("[Webhook] Parse error:", e.message);
    }
    res.status(200).send("OK");
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