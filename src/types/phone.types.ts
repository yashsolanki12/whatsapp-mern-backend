import { Document, Types } from "mongoose";

export interface IWhatsAppPhone extends Document {
  phone_number: string;
  country_code: string;
  shopify_session_id?: Types.ObjectId; // FK reference
}
