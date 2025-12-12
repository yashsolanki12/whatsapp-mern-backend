import { PhoneModel } from "../models/phone.js";
// Create new phone
export const createPhone = async (data) => {
    return await PhoneModel.create({
        phone_number: data.phone_number,
        country_code: data.country_code,
        shopify_session_id: data.shopify_session_id,
    });
};
// Get all phone
export const getAllPhone = async () => {
    return await PhoneModel.find().sort({ createdAt: -1 });
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