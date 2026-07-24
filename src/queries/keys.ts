export const qk = {
  me: ["patient", "me"] as const,
  myCard: ["patient", "card"] as const,
  health: ["health"] as const,
  notifications: ["patient", "notifications"] as const,
  unread: ["patient", "notifications", "unread"] as const,
  accessRequests: ["patient", "access-requests"] as const,
  accessPending: ["patient", "access-requests", "pending"] as const,
  accessActive: ["patient", "access-requests", "active"] as const,
  appointments: ["patient", "appointments"] as const,
};
