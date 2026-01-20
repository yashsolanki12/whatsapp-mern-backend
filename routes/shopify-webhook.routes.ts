import express from "express";
import { uninstallCleanup } from "../controllers/phone.js";

const router = express.Router();

// Shopify app/uninstalled webhook handler
router.post("/webhooks/app/uninstalled", async (req, res) => {
  try {
    // Shopify sends the shop domain in the request body
    const shop = req.body.shop;
    if (!shop) {
      return res.status(400).json({ success: false, message: "Missing shop domain." });
    }
    // Set required API key header for uninstallCleanup
    req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
    req.body.shop = shop;
    await uninstallCleanup(req, res);
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, message: "Webhook handler error." });
  }
});

export default router;
