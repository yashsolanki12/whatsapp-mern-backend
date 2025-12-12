// models/ShopifySession.ts
import mongoose, { Schema } from "mongoose";
const ShopifySessionSchema = new Schema({
    id: String,
    shop: String,
    state: String,
    isOnline: Boolean,
    scope: String,
    accessToken: String,
}, { collection: "shopify_sessions" } // <-- IMPORTANT
);
export default mongoose.model("ShopifySession", ShopifySessionSchema);
//# sourceMappingURL=shopify-sessions.js.map