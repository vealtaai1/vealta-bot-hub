import crypto from "crypto";

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// 256-bit URL-safe token for invite links, password reset, etc.
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
