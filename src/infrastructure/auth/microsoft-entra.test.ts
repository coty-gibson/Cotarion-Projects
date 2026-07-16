import { describe, expect, it } from "vitest";
import { getMicrosoftEntraConfig } from "@/infrastructure/auth/microsoft-entra";

describe("Microsoft Entra auth config", () => {
  it("returns null when any required setting is missing", () => {
    expect(
      getMicrosoftEntraConfig({
        AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID: "client-id",
        AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: "tenant-id"
      } as unknown as NodeJS.ProcessEnv)
    ).toBeNull();
  });

  it("returns provider config when all required settings are present", () => {
    expect(
      getMicrosoftEntraConfig({
        AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID: "client-id",
        AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET: "client-secret",
        AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: "tenant-id"
      } as unknown as NodeJS.ProcessEnv)
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      tenantId: "tenant-id"
    });
  });
});
