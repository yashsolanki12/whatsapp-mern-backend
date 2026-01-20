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

app.post(
  "/api/utils/generate-hmac",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      return res
        .status(StatusCode.Unauthorized)
        .json(new ApiResponse(false, "Webhook HMAC validation failed"));
    }
    const body = req.body; // This is a Buffer, just like in /api/shopify/webhook
    const digest = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    res.json({ hmac: digest });
  }
);

// Shopify Webhook Handler (direct route, no controller/router)
app.post(
  "/api/shopify/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const topic = req.get("X-Shopify-Topic");
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const shopHeader = req.get("X-Shopify-Shop-Domain");

    console.log(`[Webhook] Incoming Request - Topic: ${topic}, Shop: ${shopHeader}`);

    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      console.error("[Webhook] SHOPIFY_API_SECRET is not configured on the server.");
      return res
        .status(StatusCode.Unauthorized)
        .json(new ApiResponse(false, "Server configuration error"));
    }

    const body = req.body;
    const digest = crypto
      .createHmac("sha256", secret)
      .update(body) // No "utf8" here, use raw Buffer
      .digest("base64");

    if (digest !== hmacHeader) {
      console.error(`[Webhook] HMAC validation failed. Expected: ${digest.substring(0, 10)}..., Received: ${hmacHeader?.substring(0, 10)}...`);
      return res
        .status(StatusCode.Unauthorized)
        .json(new ApiResponse(false, "Webhook HMAC validation failed"));
    }
    // Parse the webhook payload
    try {
      const payload = JSON.parse(body.toString());
      const topic = req.get("X-Shopify-Topic");
      const shop = req.get("X-Shopify-Shop-Domain") || payload.myshopify_domain || payload.shop;

      console.log(`[Webhook] Topic: ${topic}, Shop: ${shop}`);

      if (topic === "app/uninstalled") {
        if (shop) {
          console.log(`[Webhook] Handling uninstall for: ${shop}`);
          // Set required API key header for uninstallCleanup to bypass internal auth
          req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
          // Mock req.body for uninstallCleanup since it expects { shop }
          (req as any).body = { shop };
          // Call the cleanup controller
          await uninstallCleanup(req, res);
          return; // uninstallCleanup sends the response
        } else {
          console.error("[Webhook] Uninstall topic received but shop is missing");
        }
      }
    } catch (e) {
      console.error("[Webhook] Error processing payload:", e);
      return res
        .status(StatusCode.BadRequest)
        .json(new ApiResponse(false, "Invalid JSON or processing error"));
    }
    res.status(StatusCode.Ok).json(new ApiResponse(true, "Webhook received"));
  }
);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration for Shopify Integration
// This handles cross-origin requests from Shopify admin and storefronts
// Fixes: "Missing CORS headers: Your backend wasn't configured to allow requests from the Shopify domain"
app.use(
  cors({
    origin: (origin, callback) => {
      // Pass req.method to helper for OPTIONS support
      // @ts-ignore
      const reqMethod =
        typeof this !== "undefined" &&
          this &&
          (this as any).req &&
          (this as any).req.method
          ? (this as any).req.method
          : undefined;
      if (isAllowedOrigin(origin, reqMethod)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "x-shopify-shop-domain"],
  }),
);

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
  const isAllowed = allowedOriginPatterns.some((pattern) =>
    typeof pattern === "string"
      ? pattern === origin
      : pattern.test(origin || ""),
  );
  if (isAllowed || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Shopify-Access-Token, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Hmac-SHA256, ngrok-skip-browser-warning",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Range, X-Total-Count",
    );
  }
  if (req.method === "OPTIONS") return res.status(204).end();
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
app.use((err: any, _req: any, res: any, _next: any) => {
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
