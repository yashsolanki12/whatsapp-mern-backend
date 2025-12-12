import { z } from "zod";
export const phoneSchema = z.object({
    body: z.object({
        phone_number: z
            .string()
            .min(1, { message: "Phone number is required" })
            .max(15, { message: "Phone number must be less than 15 characters" }),
        country_code: z
            .string()
            .min(1, { message: "Country code is required" })
            .regex(/^\+\d{1,4}$/, {
            message: "Country code must start with + and contain 1 to 4 digits",
        }),
        shopify_session_id: z.string().optional(),
    }),
});
//# sourceMappingURL=phone.js.map