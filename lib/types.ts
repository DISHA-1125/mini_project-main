export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "SECURITY";
};

export type ItemWithLocation = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: "LOST" | "FOUND";
  status: string;
  imageUrl: string | null;
  createdAt: string;
  reportedBy: { id: string; name: string };
  location: { latitude: number; longitude: number; address: string | null } | null;
};

export type DashboardStats = {
  totalItems: number;
  activeItems: number;
  matchedItems: number;
  flaggedItems: number;
  pendingClaims: number;
  handoversToday: number;
};
