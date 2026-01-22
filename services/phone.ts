// Get all phone, optionally filtered (e.g., by shopify_session_id)
import mongoose from "mongoose";
import { PhoneModel } from "../models/phone.js";
import { IWhatsAppPhone } from "../types/phone.types.js";

// Create new phone
export const createPhone = async (
  data: Pick<
    IWhatsAppPhone,
    "phone_number" | "country_code" | "shopify_session_id" | "message" | "position" | "button_style" | "custom_icon"
  >
): Promise<IWhatsAppPhone> => {
  return await PhoneModel.create({
    phone_number: data.phone_number,
    country_code: data.country_code,
    shopify_session_id: data.shopify_session_id,
    message: data.message,
    position: data.position,
    button_style: data.button_style,
    custom_icon: data.custom_icon,
  });
};



export const getAllPhone = async (
  filter: Partial<IWhatsAppPhone> = {}
): Promise<IWhatsAppPhone[]> => {
  // Prepare a filter that matches the schema types
  const mongoFilter: any = { ...filter };
  if (mongoFilter.shopify_session_id) {
    mongoFilter.shopify_session_id = new mongoose.Types.ObjectId(
      mongoFilter.shopify_session_id as any
    );
  }
  return await PhoneModel.find(mongoFilter).sort({ createdAt: -1 });
};

// Get phone by id
export const getPhoneById = async (
  id: string
): Promise<IWhatsAppPhone | null> => {
  return await PhoneModel.findById(id);
};

// Update phone by id
export const updatePhone = async (
  id: string,
  data: Partial<Pick<IWhatsAppPhone, "phone_number" | "country_code" | "message" | "position" | "button_style" | "custom_icon">>
): Promise<IWhatsAppPhone | null> => {
  return await PhoneModel.findByIdAndUpdate(id, data, { new: true });
};

// Delete phone by id
export const deletePhoneById = async (
  id: string
): Promise<IWhatsAppPhone | null> => {
  return await PhoneModel.findByIdAndDelete(id);
};
