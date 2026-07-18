import { describe, expect, it } from "vitest";
import {
  CLIENT_NOTES_MAX_LENGTH,
  normalizeClientName,
  validateClientForm
} from "@/application/clients/client-validation";

function validFormData() {
  const formData = new FormData();
  formData.set("name", "Acme Manufacturing");
  formData.set("status", "PROSPECT");
  return formData;
}

describe("client validation", () => {
  it("normalizes names for duplicate detection", () => {
    expect(normalizeClientName("  ACME   Manufacturing  ")).toBe("acme manufacturing");
  });

  it("accepts approved client fields and a complete primary contact", () => {
    const formData = validFormData();
    formData.set("businessType", "MANUFACTURING");
    formData.set("website", "https://example.com");
    formData.set("imageUrl", "https://example.com/logo.png");
    formData.set("street", "100 Main Street");
    formData.set("city", "Chicago");
    formData.set("state", "IL");
    formData.set("postalCode", "60601");
    formData.set("contactFirstName", "Ada");
    formData.set("contactLastName", "Lovelace");
    formData.set("contactEmail", "ada@example.com");
    formData.set("contactPhone", "+1 (312) 555-0100");

    const result = validateClientForm(formData);

    expect(result.errors).toEqual({});
    expect(result.input?.contact?.email).toBe("ada@example.com");
    expect(result.input?.businessType).toBe("MANUFACTURING");
    expect(result.input?.status).toBe("PROSPECT");
  });

  it("rejects incomplete contacts, invalid URLs, and unsupported statuses", () => {
    const formData = validFormData();
    formData.set("status", "ARCHIVED");
    formData.set("website", "javascript:alert(1)");
    formData.set("contactEmail", "person@example.com");

    const result = validateClientForm(formData);

    expect(result.input).toBeNull();
    expect(result.errors.status).toBeDefined();
    expect(result.errors.website).toBeDefined();
    expect(result.errors.contactFirstName).toBeDefined();
    expect(result.errors.contactLastName).toBeDefined();
  });

  it("rejects free-text industries outside the controlled list", () => {
    const formData = validFormData();
    formData.set("businessType", "Custom Industry");

    const result = validateClientForm(formData);

    expect(result.input).toBeNull();
    expect(result.errors.businessType).toBe("Select a valid industry.");
  });

  it("supports substantial notes while enforcing the documented limit", () => {
    const allowed = validFormData();
    allowed.set("notes", "n".repeat(CLIENT_NOTES_MAX_LENGTH));
    expect(validateClientForm(allowed).input?.notes).toHaveLength(CLIENT_NOTES_MAX_LENGTH);

    const excessive = validFormData();
    excessive.set("notes", "n".repeat(CLIENT_NOTES_MAX_LENGTH + 1));
    expect(validateClientForm(excessive).errors.notes).toBeDefined();
  });
});
