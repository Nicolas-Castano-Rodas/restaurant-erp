export function toMinor(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Invalid money amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function fromMinor(value: bigint): string {
  if (value < 0n) throw new Error("Invalid money amount");
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}
