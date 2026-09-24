import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'v1:';

export function chatEncryptionKey() {
  const encoded = process.env.CHAT_ENCRYPTION_KEY?.trim() || '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('chat-key-not-configured');
  return key;
}

export function encryptChatBody(body: string, channelKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chatEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(channelKey, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

export function decryptChatBody(body: string, channelKey: string) {
  if (!body.startsWith(PREFIX)) throw new Error('chat-decryption-failed');
  const payload = Buffer.from(body.slice(PREFIX.length), 'base64');
  if (payload.length < 29) throw new Error('chat-decryption-failed');
  try {
    const decipher = createDecipheriv('aes-256-gcm', chatEncryptionKey(), payload.subarray(0, 12));
    decipher.setAAD(Buffer.from(channelKey, 'utf8'));
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('chat-decryption-failed');
  }
}
