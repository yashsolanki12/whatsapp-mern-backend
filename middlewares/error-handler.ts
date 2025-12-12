import { StatusCode } from "../utils/status-codes.js";
import { ApiResponse } from "../utils/api-response.js";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): any => {
  console.log("❌ Error", err);

  return res
    .status(err.status || StatusCode.INTERNAL_SERVER_ERROR)
    .json(new ApiResponse(false, err.message || "Something went wrong", null));
};
