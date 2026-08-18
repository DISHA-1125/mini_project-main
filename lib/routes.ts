export type UserRole = "USER" | "ADMIN" | "SECURITY";

export function dashboardPath(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "SECURITY":
      return "/dashboard/security";
    default:
      return "/dashboard/user";
  }
}
