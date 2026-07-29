import { type User } from "../../../generated/prisma/client.ts";

export type SafeUser = Pick<User, "id" | "name" | "email" | "createdAt">;

export interface AuthTokens {
  token: string;
  user: SafeUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
