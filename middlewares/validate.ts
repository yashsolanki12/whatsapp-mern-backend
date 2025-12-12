import { ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/api-response.js";
import { z } from "zod";
import { StatusCode } from "../utils/status-codes.js";

export const validate =
  (schema: ZodObject<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(new ApiResponse(false, "Request body is required"));
    }
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      // 👇 this is what needs adding on a route level
      if (error instanceof z.ZodError) {
        return res
          .status(StatusCode.BAD_REQUEST)
          .json(error._zod.def.map((i: any) => i.message));
      }

      console.error(error);
      res.status(StatusCode.INTERNAL_SERVER_ERROR).json(new ApiResponse(false, "Internal server error",null));
    }
  };
