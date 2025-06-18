export const bufferToHexString = (buffer, start, length, sep = "") =>
  Array.from(new Uint8Array(buffer.slice(start, start + length)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join(sep);
export const hexStringToNumberArray = (hexString) =>
  hexString.match(/[\da-f]{2}/gi).map((h) => parseInt(h, 16));
