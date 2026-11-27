export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || "secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
};
