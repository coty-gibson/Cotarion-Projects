const TOKEN_VERSION = "pricing-concurrency-v1";

export class PricingConcurrencyTokenError extends Error {
  constructor() {
    super("Concurrency token is invalid.");
    this.name = "PricingConcurrencyTokenError";
  }
}

export function encodePricingConcurrencyToken(currentVersion: number) {
  if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) {
    throw new PricingConcurrencyTokenError();
  }
  return Buffer.from(`${TOKEN_VERSION}:${currentVersion}`, "utf8").toString("base64url");
}

export function decodePricingConcurrencyToken(token: unknown) {
  if (typeof token !== "string" || !token || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new PricingConcurrencyTokenError();
  }
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    throw new PricingConcurrencyTokenError();
  }
  const match = decoded.match(/^pricing-concurrency-v1:([1-9][0-9]*)$/);
  const currentVersion = match ? Number(match[1]) : Number.NaN;
  if (
    !Number.isSafeInteger(currentVersion) ||
    encodePricingConcurrencyToken(currentVersion) !== token
  ) {
    throw new PricingConcurrencyTokenError();
  }
  return currentVersion;
}
