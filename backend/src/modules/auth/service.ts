import bcrypt from "bcryptjs";
import { authRepository } from "./repository.ts";
import { signToken } from "../../config/jwt.ts";
import { AppError } from "../../shared/errors.ts";
import type { SafeUser, AuthTokens } from "./types.ts";

const SALT_ROUNDS = 12;

function toSafeUser(user: { id: string; name: string; email: string; createdAt: Date }): SafeUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export const authService = {
  async register(input: { name: string; email: string; password: string }): Promise<AuthTokens> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, "Email already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await authRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const token = signToken({ userId: user.id, email: user.email });
    return { token, user: toSafeUser(user) };
  },

  async login(input: { email: string; password: string }): Promise<AuthTokens> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signToken({ userId: user.id, email: user.email });
    return { token, user: toSafeUser(user) };
  },

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return toSafeUser(user);
  },
};
