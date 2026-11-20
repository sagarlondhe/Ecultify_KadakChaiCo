import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!username || !passwordHash || !BCRYPT_HASH_PATTERN.test(passwordHash)) {
    throw new Error('Admin credentials are not configured correctly');
  }

  return { username, passwordHash };
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const configured = getAdminCredentials();
  const passwordMatches = await bcrypt.compare(
    password,
    configured.passwordHash
  );
  const usernameMatches = safeStringEqual(username, configured.username);

  return passwordMatches && usernameMatches;
}
