import { StatusCode } from "../utils/status-codes.js";
import { ApiResponse } from "../utils/api-response.js";
export const errorHandler = (err, _req, res, _next) => {
    console.log("❌ Error", err);
    return res
        .status(err.status || StatusCode.INTERNAL_SERVER_ERROR)
        .json(new ApiResponse(false, err.message || "Something went wrong", null));
};
//# sourceMappingURL=error-handler.js.map