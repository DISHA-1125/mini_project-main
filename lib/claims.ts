import { createHash, randomInt } from "crypto";

export function hashAnswer(answer: string): string {
  return createHash("sha256").update(answer.trim().toLowerCase()).digest("hex");
}

export function generateOTP(): string {
  return String(randomInt(100000, 999999));
}

export function generateQRToken(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${randomInt(100000, 999999)}`)
    .digest("hex")
    .slice(0, 32);
}
