import { PhoneModel } from "../models/phone.js";
import { IWhatsAppPhone } from "../types/phone.types.js";

// Create new phone
export const createPhone = async (
  data: Pick<IWhatsAppPhone, "phone_number" | "country_code" | "shopify_session_id">
): Promise<IWhatsAppPhone> => {
  return await PhoneModel.create({
    phone_number: data.phone_number,
    country_code: data.country_code,
    shopify_session_id: data.shopify_session_id,
  });
};

// Get all phone
export const getAllPhone = async (): Promise<IWhatsAppPhone[]> => {
  return await PhoneModel.find().sort({ createdAt: -1 });
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
  data: Pick<IWhatsAppPhone, "phone_number" | "country_code">
): Promise<IWhatsAppPhone | null> => {
  return await PhoneModel.findByIdAndUpdate(id, data, { new: true });
};

// Delete phone by id
export const deletePhoneById = async (id: string): Promise<IWhatsAppPhone | null> => {
  return await PhoneModel.findByIdAndDelete(id);
};