export const DEVELOPMENT_AUTH_PROVIDER_ID = "dev-login";
export const DEVELOPMENT_AUTH_USER = {
  id: "dev-auth-user",
  email: "dev-owner@cotarion.local",
  name: "Development User"
} as const;

export function isDevelopmentAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development" && env.ENABLE_DEV_AUTH === "true";
}

export function assertDevelopmentAuthIsNotEnabledOutsideDevelopment(
  env: NodeJS.ProcessEnv = process.env
): void {
  if (env.ENABLE_DEV_AUTH === "true" && env.NODE_ENV !== "development") {
    throw new Error("Development authentication cannot be enabled outside development.");
  }
}
