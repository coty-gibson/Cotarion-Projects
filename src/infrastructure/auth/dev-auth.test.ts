import { describe, expect, it } from "vitest";
import {
  assertDevelopmentAuthIsNotEnabledOutsideDevelopment,
  isDevelopmentAuthEnabled
} from "@/infrastructure/auth/dev-auth";

describe("development authentication guard", () => {
  it("enables development auth only with the explicit development flag", () => {
    expect(
      isDevelopmentAuthEnabled({
        NODE_ENV: "development",
        ENABLE_DEV_AUTH: "true"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("disables development auth when the flag is absent", () => {
    expect(
      isDevelopmentAuthEnabled({
        NODE_ENV: "development"
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it("fails closed outside development", () => {
    expect(() =>
      assertDevelopmentAuthIsNotEnabledOutsideDevelopment({
        NODE_ENV: "production",
        ENABLE_DEV_AUTH: "true"
      } as NodeJS.ProcessEnv)
    ).toThrow("Development authentication cannot be enabled outside development.");
  });
});
