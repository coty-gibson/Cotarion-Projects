export interface SignatureProvider { issue(companyId: string, requestIdentity: string): { token: string; digest: string }; digest(token: string): string; method: "INTERNAL_SECURE_LINK"; }
