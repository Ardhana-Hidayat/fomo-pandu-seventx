import "server-only";
import { type Teacher } from "../../db/schema";
import {
  signInDemoTeacher,
  getTeacherBySessionToken,
  signOutTeacher,
} from "./demo";
import { env } from "../../config/env";

export interface AuthProvider {
  getTeacher(sessionToken: string): Promise<Teacher | null>;
  signInDemo(): Promise<{ teacher: Teacher; token: string }>;
  signOut(sessionToken: string): Promise<void>;
}

export const demoAuthProvider: AuthProvider = {
  getTeacher: getTeacherBySessionToken,
  signInDemo: signInDemoTeacher,
  signOut: signOutTeacher,
};

export function getAuthProvider(): AuthProvider {
  if (env.AUTH_MODE === "demo") {
    return demoAuthProvider;
  }
  // Fallback ke demo jika google belum dikonfigurasi
  return demoAuthProvider;
}
