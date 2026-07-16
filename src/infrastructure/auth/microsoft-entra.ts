export const MICROSOFT_ENTRA_PROVIDER_ID = "azure-ad";

export interface MicrosoftEntraConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export function getMicrosoftEntraConfig(
  env: NodeJS.ProcessEnv = process.env
): MicrosoftEntraConfig | null {
  const clientId = env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID;
  const clientSecret = env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET;
  const tenantId = env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    tenantId
  };
}
