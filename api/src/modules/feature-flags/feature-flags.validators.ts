import { z } from "zod";

export const updateUserPermissionsSchema = z.object({
  permissionKeys: z.array(z.string())
});
