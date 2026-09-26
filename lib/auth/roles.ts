import type { Database } from "@/lib/db/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const STAFF_ROLES: AppRole[] = ["ADMIN", "OPS"];

export function isStaffRole(role: AppRole): boolean {
  return STAFF_ROLES.includes(role);
}
