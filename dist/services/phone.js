// Get all phone, optionally filtered (e.g., by shopify_session_id)
import mongoose from "mongoose";
import { PhoneModel } from "../models/phone.js";
// Create new phone
export const createPhone = async (data) => {
    return await PhoneModel.create({
        phone_number: data.phone_number,
        country_code: data.country_code,
        shopify_session_id: data.shopify_session_id,
    });
};
export const getAllPhone = async (filter = {}) => {
    // Prepare a filter that matches the schema types
    const mongoFilter = { ...filter };
    if (mongoFilter.shopify_session_id) {
        mongoFilter.shopify_session_id = new mongoose.Types.ObjectId(mongoFilter.shopify_session_id);
    }
    return await PhoneModel.find(mongoFilter).sort({ createdAt: -1 });
};
// Get phone by id
export const getPhoneById = async (id) => {
    return await PhoneModel.findById(id);
};
// Update phone by id
export const updatePhone = async (id, data) => {
    return await PhoneModel.findByIdAndUpdate(id, data, { new: true });
};
// Delete phone by id
export const deletePhoneById = async (id) => {
    return await PhoneModel.findByIdAndDelete(id);
};
//# sourceMappingURL=phone.js.map