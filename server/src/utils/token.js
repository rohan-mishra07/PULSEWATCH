
import jwt from "jsonwebtoken";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { sub: userId, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
};

export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

  if (payload.type !== "access") {
    throw new Error("Invalid access token");
  }

  return payload;
};

export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  return payload;
};
