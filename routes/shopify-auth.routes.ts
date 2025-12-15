import express from "express";
import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { StatusCode } from "@shopify/shopify-api";
import { ApiResponse } from "../utils/api-response.js";

const router = express.Router();
dotenv.config({ path: ".env" });

const shopifyApiKey = process.env.SHOPIFY_API_KEY;
const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;
const shopifyScopes = process.env.SHOPIFY_SCOPES;
const shopifyAppUrl = process.env.SHOPIFY_APP_URL;

// Step 1: Redirect to Shopify OAuth
router.get("/install", (req, res) => {
  const { shop } = req.query;
  if (!shop)
    return res
      .status(StatusCode.BadRequest)
      .json(new ApiResponse(false, "Missing shop param"));
  const redirectUri = `${shopifyAppUrl}/api/shopify/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${shopifyApiKey}&scope=${shopifyScopes}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

// Step 2: Handle OAuth callback
router.get("/callback", async (req, res) => {
  const { shop, hmac, code } = req.query;
  if (!shop || !hmac || !code)
    return res
      .status(StatusCode.BadRequest)
      .json(new ApiResponse(false, "Missing params"));

  if (!shopifyApiSecret) {
    return res
      .status(StatusCode.InternalServerError)
      .json(new ApiResponse(false, "Shopify API secret is not configured"));
  }
  // HMAC validation
  const params = { ...req.query };
  delete params["hmac"];

  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const generatedHmac = crypto
    .createHmac("sha256", shopifyApiSecret)
    .update(message)
    .digest("hex");
  if (generatedHmac !== hmac)
    return res
      .status(StatusCode.BadRequest)
      .json(new ApiResponse(false, "HMAC validation failed"));

  // Exchange code for access token
  try {
    const tokenRes = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code,
      }
    );
    const { access_token, scope } = tokenRes.data;

    // Store session in DB (pseudo-code, adapt to your model)
    // Upsert by shop domain
    await mongoose.connection.collection("shopify_sessions").updateOne(
      { shop },
      {
        $set: {
          shop,
          accessToken: access_token,
          scope,
          isOnline: false,
        },
      },
      { upsert: true }
    );

    // Redirect to your app (embedded)
    res.redirect(`https://${shop}/admin/apps/${shopifyApiKey}?shop=${shop}`);
  } catch (err) {
    res
      .status(StatusCode.InternalServerError)
      .json(new ApiResponse(false, "Failed to get access token"));
  }
});

export default router;
