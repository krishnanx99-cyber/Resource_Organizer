import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt.ts";
import type { JwtPayload } from "../config/jwt.ts";
import { AppError } from "../shared/errors.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }

  const token = header.split(" ")[1];
  if (!token) {
    throw new AppError(401, "Missing token");
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
