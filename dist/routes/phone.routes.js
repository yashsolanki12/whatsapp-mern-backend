import { Router } from "express";
import { createNewWhatsAppPhone, deleteWhatsAppPhoneById, getAllWhatsAppPhone, getWhatsAppPhoneById, updateWhatsAppPhoneById, getCurrentShopifySessionId, } from "../controllers/phone.js";
import { validate } from "../middlewares/validate.js";
import { phoneSchema } from "../validations/phone.js";
import { handleOfflineSession } from "../controllers/phone.js";
// Shopify session storage endpoints for /api/phone/:id (for session id, not phone id)
import { handleSessionById } from "../controllers/phone.js";
const router = Router();
// get current shopify_session_id for frontend
router.get("/session/current", getCurrentShopifySessionId);
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
// Shopify session storage endpoint
// /session
router
    .route("/session/:id")
    .get(handleSessionById)
    .post(handleSessionById)
    .delete(handleSessionById);
// get phone by id (only if id is a valid ObjectId)
router.get("/:id", getWhatsAppPhoneById);
// update phone by id
router.put("/:id", validate(phoneSchema), updateWhatsAppPhoneById);
// delete phone by id
router.delete("/:id", deleteWhatsAppPhoneById);
export default router;
//# sourceMappingURL=phone.routes.js.map