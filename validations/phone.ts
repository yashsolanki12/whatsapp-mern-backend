import { z } from "zod";

export const phoneSchema = z.object({
  body: z.object({
    phone_number: z
      .string()
      .min(1, { message: "Phone number is required." })
      .max(15, { message: "Phone number must be less than 15 characters." }),
    country_code: z
      .string()
      .min(1, { message: "Country code is required." })
      .regex(/^\+\d{1,4}$/, {
        message:
          "Please enter a valid country code starting with '+' followed by 1 to 3 digits (e.g., +1 or +44).",
      }),
    shopify_session_id: z.string().optional(),
  }),
});
