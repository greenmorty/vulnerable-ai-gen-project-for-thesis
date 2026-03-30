/**
 * Responsibility: Encapsulates password hashing and verification using bcrypt with the required work factor.
 */
import bcrypt from "bcrypt";

const PASSWORD_SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

