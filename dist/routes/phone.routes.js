import { Router } from "express";
import { createNewWhatsAppPhone, deleteWhatsAppPhoneById, getAllWhatsAppPhone, getWhatsAppPhoneById, updateWhatsAppPhoneById, getCurrentShopifySessionId, } from "../controllers/phone.js";
import { validate } from "../middlewares/validate.js";
import { phoneSchema } from "../validations/phone.js";
import { handleOfflineSession } from "../controllers/phone.js";
const router = Router();
// create new phone
router.post("/add", validate(phoneSchema), createNewWhatsAppPhone);
// get all phones
router.get("/", getAllWhatsAppPhone);
// Shopify session storage endpoints for offline_{shop} (must be above :id route)
router
    .route("/offline_:shop")
    .get(handleOfflineSession)
    .post(handleOfflineSession)
    .delete(handleOfflineSession);
// get phone by id
router.get("/:id", getWhatsAppPhoneById);
// update phone by id
router.put("/:id", validate(phoneSchema), updateWhatsAppPhoneById);
// delete phone by id
router.delete("/:id", deleteWhatsAppPhoneById);
// get current shopify_session_id for frontend
router.get("/session/current", getCurrentShopifySessionId);
export default router;
//# sourceMappingURL=phone.routes.js.map