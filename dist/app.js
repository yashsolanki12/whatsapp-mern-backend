import crypto from "crypto";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDb } from "./config/db.js";
import { errorHandler } from "./middlewares/error-handler.js";
import cookieParser from "cookie-parser";
// Serve static files from the React app build
import { ApiResponse } from "./utils/api-response.js";
import { StatusCode } from "@shopify/shopify-api";
import phoneRoutes from "./routes/phone.routes.js";
import shopifyAuthRoutes from "./routes/shopify-auth.routes.js";
import { allowedOrigin } from "./utils/helper.js";
// Initialize express app
const app = express();
// Load environment variables
dotenv.config({ path: ".env" });
// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigin.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true
}));
// Dynamic CORS middleware for dev and preview environments
const allowedOriginPatterns = [
    /.*\.myshopify\.com$/,
    /.*\.ngrok-free\.dev$/,
    /.*\.trycloudflare\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    /^http:\/\/localhost:\d+$/,
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
// Basic route for testing
app.get("/", (_req, res) => {
    res.json({ message: "Server is running 🚀" });
});
// // Routes for phone
app.use("/api/phone", phoneRoutes);
// Routes for Shopify authentication
app.use("/api/shopify", shopifyAuthRoutes);
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use(express.static(path.join(__dirname, "../web/build")));
// // Serve React app for all non-API routes
// app.get("*", (req, res) => {
//   if (req.originalUrl.startsWith("/api/"))
//     return res.status(StatusCode.NotFound).json({ error: "Not Found" });
//   res.sendFile(path.join(__dirname, ""));
// });
// Global Error Handler
app.use(errorHandler);
// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.status(StatusCode.Ok).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected",
    });
});
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
// Shopify Webhook Handler (direct route, no controller/router)
app.post("/api/shopify/webhook", express.raw({ type: "application/json" }), (req, res) => {
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
        return res
            .status(StatusCode.Unauthorized)
            .json(new ApiResponse(false, "Webhook HMAC validation failed"));
    }
    const body = req.body;
    const digest = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");
    if (digest !== hmacHeader) {
        return res
            .status(StatusCode.Unauthorized)
            .json(new ApiResponse(false, "Webhook HMAC validation failed"));
    }
    // Parse the webhook payload
    let payload;
    try {
        payload = JSON.parse(body.toString());
    }
    catch (e) {
        return res
            .status(StatusCode.BadRequest)
            .json(new ApiResponse(false, "Invalid JSON"));
    }
    // Handle the webhook event here
    console.log("Received webhook:", req.headers["x-shopify-topic"], payload);
    res.status(StatusCode.Ok).json(new ApiResponse(true, "Webhook received"));
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