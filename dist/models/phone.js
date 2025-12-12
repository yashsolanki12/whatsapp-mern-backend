import { Schema, model } from "mongoose";
const phoneSchema = new Schema({
    phone_number: { type: String, required: true },
    country_code: { type: String, required: true },
    shopify_session_id: {
        type: Schema.Types.ObjectId,
        ref: "ShopifySession",
        required: true
    },
}, { timestamps: true });
export const PhoneModel = model("Phone", phoneSchema);
//# sourceMappingURL=phone.js.map