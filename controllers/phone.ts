import ShopifySession from "../models/shopify-sessions.js";

import * as phoneService from "../services/phone.js";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/api-response.js";
import { StatusCode } from "../utils/status-codes.js";
import { PhoneModel } from "../models/phone.js";

// Get current shopify_session_id for frontend
export const getCurrentShopifySessionId = async (
  req: Request,
  res: Response
) => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;
    console.log("🔑 getCurrentShopifySessionId - Shop domain:", shopDomain);
    
    if (!shopDomain) {
      console.log("❌ Missing shop domain header in session request");
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Missing shop domain header."));
    }

    const sessionDoc = await mongoose.connection
      .collection("shopify_sessions")
      .findOne({ shop: shopDomain });
      
    console.log("🔍 Session document found:", sessionDoc ? "Yes" : "No");
    
    if (!sessionDoc || !sessionDoc._id) {
      console.log("❌ Session not found for shop:", shopDomain);
      return res
        .status(StatusCode.NOT_FOUND)
        .json(new ApiResponse(false, "Session not found."));
    }
    if (sessionDoc) {
      console.log("✅ Session found successfully");
      return res.json({ success: true, session: sessionDoc });
    }
  } catch (error) {
    console.error("❌ Error in getCurrentShopifySessionId:", error);
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Create
export const createNewWhatsAppPhone = async (req: Request, res: Response) => {
  try {
    const { phone_number, country_code, shopify_session_id } = req.body;

    if (!phone_number || !country_code || !shopify_session_id) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(
          new ApiResponse(
            false,
            "Phone number, country code, and shopify_session_id are required."
          )
        );
    }

    const existingNumber = await PhoneModel.findOne({ phone_number });

    if (existingNumber) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Phone number already exist."));
    }

    const newPhone = await phoneService.createPhone({
      phone_number,
      country_code,
      shopify_session_id,
    });

    if (!newPhone) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Failed to create new phone."));
    }
    return res
      .status(StatusCode.CREATED)
      .json(new ApiResponse(true, "Phone created successfully.", newPhone));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// List
export const getAllWhatsAppPhone = async (_req: Request, res: Response) => {
  try {
    // Get shop domain from header
    const shopDomain = res.req.headers["x-shopify-shop-domain"] as string;
    console.log("📱 getAllWhatsAppPhone - Shop domain:", shopDomain);
    
    if (!shopDomain) {
      console.log("❌ Missing shop domain header");
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Missing shop domain header."));
    }

    // Find the session for this shop
    const sessionDoc = await mongoose.connection
      .collection("shopify_sessions")
      .findOne({ shop: shopDomain });

    console.log("🔍 Session found:", sessionDoc ? "Yes" : "No");
    
    if (!sessionDoc || !sessionDoc._id) {
      console.log("❌ Session not found for shop:", shopDomain);
      return res
        .status(StatusCode.NOT_FOUND)
        .json(new ApiResponse(false, "Session not found."));
    }

    // Find phones for this session only
    const phones = await phoneService.getAllPhone({
      shopify_session_id: sessionDoc._id,
    });

    console.log("📱 Phones found:", phones ? phones.length : 0);

    if (!phones || phones.length === 0) {
      return res
        .status(StatusCode.OK)
        .json(new ApiResponse(false, "No phones found.", []));
    }
    if (phones) {
      return res
        .status(StatusCode.OK)
        .json(new ApiResponse(true, "Phone retrieved successfully.", phones));
    }
  } catch (error) {
    console.error("❌ Error in getAllWhatsAppPhone:", error);
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Update
export const updateWhatsAppPhoneById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phone_number, country_code } = req.body;

    if (!phone_number || !country_code) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(
          new ApiResponse(false, "Phone number and country code are required.")
        );
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Invalid phone id format."));
    }
    const updatedPhone = await phoneService.updatePhone(id, {
      phone_number,
      country_code,
    });
    if (!updatedPhone) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(new ApiResponse(false, "Phone not found."));
    }
    if (updatedPhone) {
      return res
        .status(StatusCode.OK)
        .json(
          new ApiResponse(true, "Phone updated successfully.", updatedPhone)
        );
    }
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Detail
export const getWhatsAppPhoneById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Invalid phone id format."));
    }

    const phone = await phoneService.getPhoneById(id);

    if (!phone) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(new ApiResponse(false, "Phone not found."));
    }
    if (phone) {
      return res
        .status(StatusCode.OK)
        .json(new ApiResponse(true, "Phone retrieved successfully.", phone));
    }
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Delete
export const deleteWhatsAppPhoneById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Invalid phone id format."));
    }

    const deletedPhone = await phoneService.deletePhoneById(id);

    if (!deletedPhone) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(new ApiResponse(false, "Phone not found."));
    }
    if (deletedPhone) {
      return res
        .status(StatusCode.OK)
        .json(
          new ApiResponse(true, "Phone deleted successfully.", deletedPhone)
        );
    }
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Handle GET, POST, DELETE for /api/phone/offline_{shop}
export const handleOfflineSession = async (req: Request, res: Response) => {
  const shopParam = req.params.shop;
  const shop = shopParam?.replace(/^offline_/, "");
  if (!shop) {
    return res
      .status(StatusCode.BAD_REQUEST)
      .json(new ApiResponse(false, "Missing shop domain in URL."));
  }
  try {
    if (req.method === "GET") {
      // Find session by shop domain
      const session = await ShopifySession.findOne({ shop });
      if (!session) {
        return res
          .status(StatusCode.NOT_FOUND)
          .json(new ApiResponse(false, "Session not found."));
      }
      return res.status(StatusCode.OK).json(session);
    } else if (req.method === "POST") {
      // Upsert session by shop domain
      const data = req.body;
      if (!data || !data.id || !data.shop) {
        return res
          .status(StatusCode.BAD_REQUEST)
          .json(new ApiResponse(false, "Missing session data (id, shop)."));
      }
      const updated = await ShopifySession.findOneAndUpdate(
        { shop: data.shop },
        { $set: data },
        { upsert: true, new: true }
      );
      return res.status(StatusCode.OK).json(updated);
    } else if (req.method === "DELETE") {
      // Delete session by shop domain
      const deleted = await ShopifySession.findOneAndDelete({ shop });
      if (!deleted) {
        return res
          .status(StatusCode.NOT_FOUND)
          .json(new ApiResponse(false, "Session not found to delete."));
      }
      return res
        .status(StatusCode.OK)
        .json(new ApiResponse(true, "Session deleted.", deleted));
    } else {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Unsupported method."));
    }
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};

// Handle GET, POST, DELETE for /api/phone/:id (Shopify session storage)
export const handleSessionById = async (req: Request, res: Response) => {
  const id = req.params.id;
  // Only handle if id is NOT a valid ObjectId (to avoid conflict with phone routes)
  if (mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(StatusCode.BAD_REQUEST)
      .json(new ApiResponse(false, "Not a session id route."));
  }
  try {
    if (req.method === "GET") {
      const session = await ShopifySession.findOne({ id });
      if (!session) {
        return res
          .status(StatusCode.NOT_FOUND)
          .json(new ApiResponse(false, "Session not found."));
      }
      return res.status(StatusCode.OK).json(session);
    } else if (req.method === "POST") {
      const data = req.body;
      if (!data || !data.id || !data.shop) {
        return res
          .status(StatusCode.BAD_REQUEST)
          .json(new ApiResponse(false, "Missing session data (id, shop)"));
      }
      const updated = await ShopifySession.findOneAndUpdate(
        { id: data.id },
        { $set: data },
        { upsert: true, new: true }
      );
      return res.status(StatusCode.OK).json(updated);
    } else if (req.method === "DELETE") {
      const deleted = await ShopifySession.findOneAndDelete({ id });
      if (!deleted) {
        return res
          .status(StatusCode.NOT_FOUND)
          .json(new ApiResponse(false, "Session not found to delete."));
      }
      return res
        .status(StatusCode.OK)
        .json(new ApiResponse(true, "Session deleted.", deleted));
    } else {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Unsupported method."));
    }
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(false, "Internal server error"));
  }
};
