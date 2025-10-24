import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Password reset token model (in-memory for simplicity)
interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: Date;
  userType: 'admin' | 'restaurant' | 'staff';
}

const passwordResetTokens: Map<string, PasswordResetToken> = new Map();

export const generatePasswordResetToken = (email: string, userType: 'admin' | 'restaurant' | 'staff'): string => {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  
  // Store the token
  passwordResetTokens.set(token, {
    email,
    token,
    expiresAt,
    userType
  });
  
  return token;
};

export const validatePasswordResetToken = (token: string): PasswordResetToken | null => {
  const resetData = passwordResetTokens.get(token);
  
  if (!resetData) {
    return null;
  }
  
  // Check if token is expired
  if (new Date() > resetData.expiresAt) {
    passwordResetTokens.delete(token);
    return null;
  }
  
  return resetData;
};

export const consumePasswordResetToken = (token: string): PasswordResetToken | null => {
  const resetData = validatePasswordResetToken(token);
  
  if (resetData) {
    passwordResetTokens.delete(token);
  }
  
  return resetData;
};

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs');
  // Frontend sends SHA256-hashed password, we add bcrypt
  return await bcrypt.hash(password, 10);
};