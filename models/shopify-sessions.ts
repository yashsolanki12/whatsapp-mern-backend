// models/ShopifySession.ts
import mongoose, { Schema, Document } from "mongoose";

interface IShopifySession extends Document {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope: string;
  accessToken: string;
}

const ShopifySessionSchema = new Schema<IShopifySession>(
  {
    id: String,
    shop: String,
    state: String,
    isOnline: Boolean,
    scope: String,
    accessToken: String,
  },
  { collection: "shopify_sessions" } // <-- IMPORTANT
);

export default mongoose.model<IShopifySession>(
  "ShopifySession",
  ShopifySessionSchema
);
