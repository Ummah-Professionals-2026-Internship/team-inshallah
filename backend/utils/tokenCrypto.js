import crypto from "crypto";

// simple AES-256 encryption for calendar tokens before they're saved to the DB
// requires a 32-byte key in .env as TOKEN_ENCRYPTION_KEY (a random 64-character hex string)
const ALGORITHM = "aes-256-cbc";

function getKey() {
  return Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "hex");
}

export function encryptToken(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptToken(encryptedText) {
  const [ivHex, dataHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}