// src/config/jwt.js
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  },
};
