import { Schema, model } from "mongoose";
import { IWhatsAppPhone } from "../types/phone.types.js";

const phoneSchema = new Schema<IWhatsAppPhone>(
  {
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
  },
  { timestamps: true }
);

export const PhoneModel = model<IWhatsAppPhone>("Phone", phoneSchema);
