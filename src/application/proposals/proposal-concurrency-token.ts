const TOKEN_VERSION = "proposal-concurrency-v1";

export class ProposalConcurrencyTokenError extends Error {
  constructor() {
    super("Concurrency token is invalid.");
    this.name = "ProposalConcurrencyTokenError";
  }
}

export function encodeProposalConcurrencyToken(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new ProposalConcurrencyTokenError();
  return Buffer.from(`${TOKEN_VERSION}:${revision}`, "utf8").toString("base64url");
}

export function decodeProposalConcurrencyToken(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new ProposalConcurrencyTokenError();
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  const match = decoded.match(/^proposal-concurrency-v1:([1-9][0-9]*)$/);
  const revision = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(revision) || encodeProposalConcurrencyToken(revision) !== value) throw new ProposalConcurrencyTokenError();
  return revision;
}
