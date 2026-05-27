import crypto from "crypto"

const getKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY

  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  }

  return Buffer.from(key, "hex")  // converts hex string → 32 byte buffer
}

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv)

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ])

  // store iv:encryptedData so we can decrypt later
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`
}

export const decrypt = (data: string): string => {
  const [ivHex, encryptedHex] = data.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")

  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8")
}