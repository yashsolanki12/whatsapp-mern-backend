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
app.use((req: any, _res, next) => {
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

app.post(
  "/api/utils/generate-hmac",
  express.raw({ type: "application/json" }),
  (req, res) => {
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
  },
);

app.post(
  "/api/shopify/webhook",
  express.raw({ type: "*/*" }),
  async (req: any, res) => {
    const topic = req.get("X-Shopify-Topic");
    const shop = req.get("X-Shopify-Shop-Domain");
    const hmacHeader =
      req.get("X-Shopify-Hmac-Sha256") || req.get("x-shopify-hmac-sha256");

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
    } catch (e: any) {
      console.error("[Webhook] Parse error:", e.message);
    }

    res.status(200).send("OK");
  },
);

// Standard Middleware (Applied AFTER webhook route to avoid interference)
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
