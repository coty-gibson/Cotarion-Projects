import { describe, expect, it } from "vitest";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";

describe("authenticated identity session helper", () => {
  it("returns null when there is no session", () => {
    expect(getAuthenticatedIdentityFromSession(null)).toBeNull();
  });

  it("returns null when the session has no application-safe identity", () => {
    expect(
      getAuthenticatedIdentityFromSession({
        expires: "2099-01-01T00:00:00.000Z",
        user: { id: "auth-user-1" }
      })
    ).toBeNull();
  });

  it("maps a valid session to an authenticated identity", () => {
    expect(
      getAuthenticatedIdentityFromSession({
        expires: "2099-01-01T00:00:00.000Z",
        user: {
          id: "auth-user-1",
          email: "person@example.com",
          name: "Person Example"
        }
      })
    ).toEqual({
      id: "auth-user-1",
      email: "person@example.com",
      name: "Person Example"
    });
  });
});
