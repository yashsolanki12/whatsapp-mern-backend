import { Schema, model } from "mongoose";
const phoneSchema = new Schema({
    phone_number: { type: String, required: true },
    country_code: { type: String, required: true },
    message: { type: String, default: "" },
    position: { type: String, default: "right" },
    button_style: { type: String, default: "icon_only" },
    custom_icon: { type: String, default: "whatsapp" },
    shopify_session_id: {
        type: Schema.Types.ObjectId,
        ref: "ShopifySession",
        required: true
    },
}, { timestamps: true });
export const PhoneModel = model("Phone", phoneSchema);
//# sourceMappingURL=phone.js.map