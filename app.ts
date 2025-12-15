import express from "express";
import dotenv from "dotenv";
// import cors from "cors";
import { connectDb } from "./config/db.js";
import { errorHandler } from "./middlewares/error-handler.js";
import phoneRoutes from "./routes/phone.routes.js";
import cookieParser from "cookie-parser";

// Initialize express app
const app = express();

// Load environment variables
dotenv.config({ path: ".env" });

// Middleware
app.use(cookieParser());
app.use(express.json());

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
  const isAllowed = allowedOriginPatterns.some((pattern) =>
    typeof pattern === "string"
      ? pattern === origin
      : pattern.test(origin || "")
  );
  if (isAllowed || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Shopify-Access-Token, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Hmac-SHA256, ngrok-skip-browser-warning"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Range, X-Total-Count"
    );
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// Basic route for testing
app.get("/", (_req, res) => {
  res.json({ message: "Server is running 🚀" });
});

// Routes for phone
app.use("/api/phone", phoneRoutes);

// Global Error Handler
app.use(errorHandler);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// Handle 404 - This must be after all other routes
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// Error handling middleware - This must be after all other middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Error:", err.message);
  res.status(500).json({
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
