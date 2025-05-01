const base32LowerCaseAlphabet = "abcdefghijklmnopqrstuvwxyz234567";

enum EncodingPadding {
  Include = 0,
  None = 1,
}

function encodeBase32_internal(
  bytes: Uint8Array,
  alphabet: string,
  padding: EncodingPadding,
): string {
  const estimatedLength = Math.ceil((bytes.length * 8) / 5);
  const resultChars = new Array<string>(estimatedLength + 7); // +7 in case we pad
  let charIndex = 0;

  let buffer = 0;
  let bufferBitSize = 0;

  for (let i = 0; i < bytes.byteLength; i++) {
    buffer = (buffer << 8) | bytes[i]; // Standard bitwise ops
    bufferBitSize += 8;

    while (bufferBitSize >= 5) {
      const shift = bufferBitSize - 5;
      const index = (buffer >> shift) & 0x1f; // 0x1f is mask for 5 bits
      resultChars[charIndex++] = alphabet[index];
      bufferBitSize -= 5;
      // Mask out the bits we've used
      buffer &= (1 << bufferBitSize) - 1;
    }
  }

  if (bufferBitSize > 0) {
    const index = (buffer << (5 - bufferBitSize)) & 0x1f;
    resultChars[charIndex++] = alphabet[index];
  }

  if (padding === EncodingPadding.Include) {
    const padLength = (8 - (charIndex % 8)) % 8;
    for (let i = 0; i < padLength; i++) {
      resultChars[charIndex++] = "=";
    }
  }

  return resultChars.slice(0, charIndex).join("");
}

export function encodeBase64urlNoPadding(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function encodeBase32LowerCaseNoPadding(bytes: Uint8Array): string {
  return encodeBase32_internal(
    bytes,
    base32LowerCaseAlphabet,
    EncodingPadding.None,
  );
}

export function encodeHexLowerCase(data: Uint8Array): string {
  return Buffer.from(data).toString("hex");
}

export function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function decodeBase64urlIgnorePadding(encoded: string): Uint8Array {
  return Buffer.from(encoded, "base64url");
}
