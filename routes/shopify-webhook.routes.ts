import express from "express";
import crypto from "crypto";
import { uninstallCleanup } from "../controllers/phone.js";

const router = express.Router();

// Shopify app/uninstalled webhook handler
router.post(
  "/webhooks/app/uninstalled",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
      const shopHeader = req.get("X-Shopify-Shop-Domain");
      const secret = process.env.SHOPIFY_API_SECRET;

      console.log("[Webhook] Received app/uninstalled webhook");
      console.log("[Webhook] Shop Header:", shopHeader);

      if (!secret) {
        console.error("[Webhook] SHOPIFY_API_SECRET is not configured.");
        return res
          .status(500)
          .json({ success: false, message: "Server configuration error." });
      }

      if (!hmacHeader) {
        console.error("[Webhook] Missing X-Shopify-Hmac-Sha256 header.");
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Verify HMAC
      const body = req.body; // express.raw makes this a Buffer
      const generatedHash = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");

      if (generatedHash !== hmacHeader) {
        console.error("[Webhook] HMAC validation failed.");
        return res
          .status(401)
          .json({ success: false, message: "HMAC validation failed." });
      }

      // Parse the body to get any additional data if needed, but shop is usually in the header
      let payload: any = {};
      try {
        payload = JSON.parse(body.toString());
      } catch (e) {
        console.error("[Webhook] Error parsing body JSON:", e);
      }

      const shop = shopHeader || payload.myshopify_domain || payload.shop;

      if (!shop) {
        console.error("[Webhook] Missing shop domain.");
        return res
          .status(400)
          .json({ success: false, message: "Missing shop domain." });
      }

      console.log(`[Webhook] Processing uninstall for: ${shop}`);

      // Set required API key header for uninstallCleanup to bypass internal auth
      req.headers["x-api-key"] = process.env.BACKEND_API_KEY;
      // Mock req.body for uninstallCleanup since it expects { shop }
      (req as any).body = { shop };

      await uninstallCleanup(req, res);
      console.log(`[Webhook] uninstallCleanup completed for shop: ${shop}`);
    } catch (error) {
      console.error("[Webhook] Error in app/uninstalled handler:", error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Webhook handler error." });
      }
    }
  },
);

export default router;
