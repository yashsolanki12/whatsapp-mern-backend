import { Document, Types } from "mongoose";

export interface IWhatsAppPhone extends Document {
  phone_number: string;
  country_code: string;
  message?: string;
  position?: string;
  button_style?: string;
  custom_icon?: string;
  shopify_session_id?: Types.ObjectId; // FK reference
}
