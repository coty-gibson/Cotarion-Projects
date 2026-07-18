import {
  CLIENT_BUSINESS_TYPES,
  CLIENT_STATUSES,
  type ClientBusinessType,
  type ClientInput,
  type ClientStatus
} from "@/application/clients/client";

export const CLIENT_NOTES_MAX_LENGTH = 20_000;

export type ClientFieldErrors = Partial<Record<string, string>>;

export interface ClientValidationResult {
  input: ClientInput | null;
  errors: ClientFieldErrors;
}

function optionalValue(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function requiredValue(formData: FormData, name: string) {
  return optionalValue(formData, name) ?? "";
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeClientName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function validateClientForm(formData: FormData): ClientValidationResult {
  const errors: ClientFieldErrors = {};
  const name = requiredValue(formData, "name");
  const businessTypeValue = optionalValue(formData, "businessType");
  const imageUrl = optionalValue(formData, "imageUrl");
  const website = optionalValue(formData, "website");
  const street = optionalValue(formData, "street");
  const city = optionalValue(formData, "city");
  const state = optionalValue(formData, "state");
  const postalCode = optionalValue(formData, "postalCode");
  const notes = optionalValue(formData, "notes");
  const statusValue = requiredValue(formData, "status");
  const contactFirstName = requiredValue(formData, "contactFirstName");
  const contactLastName = requiredValue(formData, "contactLastName");
  const contactJobTitle = optionalValue(formData, "contactJobTitle");
  const contactEmail = optionalValue(formData, "contactEmail");
  const contactPhone = optionalValue(formData, "contactPhone");

  if (!name) errors.name = "Client name is required.";
  else if (name.length > 200) errors.name = "Client name must be 200 characters or fewer.";

  const businessType =
    businessTypeValue && CLIENT_BUSINESS_TYPES.includes(businessTypeValue as ClientBusinessType)
      ? (businessTypeValue as ClientBusinessType)
      : null;
  if (businessTypeValue && !businessType)
    errors.businessType = "Select a valid industry.";
  if (website && !isValidHttpUrl(website))
    errors.website = "Website must be a valid HTTP or HTTPS URL.";
  if (imageUrl && !isValidHttpUrl(imageUrl))
    errors.imageUrl = "Logo/image must be a valid HTTP or HTTPS URL.";
  if (street && street.length > 200) errors.street = "Street must be 200 characters or fewer.";
  if (city && city.length > 100) errors.city = "City must be 100 characters or fewer.";
  if (state && state.length > 100) errors.state = "State must be 100 characters or fewer.";
  if (postalCode && postalCode.length > 20)
    errors.postalCode = "ZIP/postal code must be 20 characters or fewer.";
  if (notes && notes.length > CLIENT_NOTES_MAX_LENGTH)
    errors.notes = `Notes must be ${CLIENT_NOTES_MAX_LENGTH.toLocaleString()} characters or fewer.`;

  const status = CLIENT_STATUSES.includes(statusValue as ClientStatus)
    ? (statusValue as ClientStatus)
    : null;
  if (!status) errors.status = "Select a valid client status.";

  const hasContact = Boolean(
    contactFirstName || contactLastName || contactJobTitle || contactEmail || contactPhone
  );
  if (hasContact && !contactFirstName)
    errors.contactFirstName = "First name is required when adding a contact.";
  if (hasContact && !contactLastName)
    errors.contactLastName = "Last name is required when adding a contact.";
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    errors.contactEmail = "Enter a valid email address.";
  if (contactPhone && contactPhone.length > 40)
    errors.contactPhone = "Phone number must be 40 characters or fewer.";

  if (Object.keys(errors).length || !status) return { input: null, errors };

  return {
    errors,
    input: {
      name,
      businessType,
      imageUrl,
      website,
      street,
      city,
      state,
      postalCode,
      notes,
      status,
      contact: hasContact
        ? {
            firstName: contactFirstName,
            lastName: contactLastName,
            jobTitle: contactJobTitle,
            email: contactEmail,
            phone: contactPhone
          }
        : null
    }
  };
}
