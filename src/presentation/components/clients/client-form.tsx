"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ClientRecord } from "@/application/clients/client";
import {
  CLIENT_BUSINESS_TYPES,
  CLIENT_BUSINESS_TYPE_LABELS,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS
} from "@/application/clients/client";
import type { ClientFormState } from "@/app/(protected)/clients/actions";
import { Button } from "@/presentation/components/ui/button";

const fieldClass =
  "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null;
}

export function ClientForm({
  action,
  client
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: ClientRecord;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const contact = client?.contacts.find((item) => item.isPrimary);
  const cancelHref = client ? `/clients/${client.id}` : "/clients";

  return (
    <form action={formAction} className="mt-8 space-y-8">
      {state.message ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p>{state.message}</p>
          {state.duplicate ? (
            <p className="mt-2">
              Possible match:{" "}
              <Link className="font-medium underline" href={`/clients/${state.duplicate.id}`}>
                {state.duplicate.name} ({state.duplicate.clientNumber})
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold">Client information</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-medium">Client name *</span>
            <input className={fieldClass} defaultValue={client?.name ?? ""} name="name" required />
            <FieldError message={state.errors.name} />
          </label>
          <label>
            <span className="text-sm font-medium">Status *</span>
            <select className={fieldClass} defaultValue={client?.status ?? "PROSPECT"} name="status">
              {CLIENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CLIENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <FieldError message={state.errors.status} />
          </label>
          <label>
            <span className="text-sm font-medium">Industry</span>
            <select
              className={fieldClass}
              defaultValue={client?.businessType ?? ""}
              name="businessType"
            >
              <option value="">Not specified</option>
              {CLIENT_BUSINESS_TYPES.map((businessType) => (
                <option key={businessType} value={businessType}>
                  {CLIENT_BUSINESS_TYPE_LABELS[businessType]}
                </option>
              ))}
            </select>
            <FieldError message={state.errors.businessType} />
          </label>
          <label>
            <span className="text-sm font-medium">Website</span>
            <input
              className={fieldClass}
              defaultValue={client?.website ?? ""}
              name="website"
              placeholder="https://example.com"
              type="url"
            />
            <FieldError message={state.errors.website} />
          </label>
          <label>
            <span className="text-sm font-medium">Logo/Image URL</span>
            <input
              className={fieldClass}
              defaultValue={client?.imageUrl ?? ""}
              name="imageUrl"
              placeholder="https://example.com/logo.png"
              type="url"
            />
            <FieldError message={state.errors.imageUrl} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold">Business address</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-medium">Street</span>
            <input className={fieldClass} defaultValue={client?.street ?? ""} name="street" />
            <FieldError message={state.errors.street} />
          </label>
          <label>
            <span className="text-sm font-medium">City</span>
            <input className={fieldClass} defaultValue={client?.city ?? ""} name="city" />
            <FieldError message={state.errors.city} />
          </label>
          <label>
            <span className="text-sm font-medium">State</span>
            <input className={fieldClass} defaultValue={client?.state ?? ""} name="state" />
            <FieldError message={state.errors.state} />
          </label>
          <label>
            <span className="text-sm font-medium">ZIP/Postal Code</span>
            <input
              className={fieldClass}
              defaultValue={client?.postalCode ?? ""}
              name="postalCode"
            />
            <FieldError message={state.errors.postalCode} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold">Primary contact</h3>
        <p className="mt-1 text-sm text-muted-foreground">Optional. Complete both names if adding a contact.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium">First name</span>
            <input className={fieldClass} defaultValue={contact?.firstName ?? ""} name="contactFirstName" />
            <FieldError message={state.errors.contactFirstName} />
          </label>
          <label>
            <span className="text-sm font-medium">Last name</span>
            <input className={fieldClass} defaultValue={contact?.lastName ?? ""} name="contactLastName" />
            <FieldError message={state.errors.contactLastName} />
          </label>
          <label>
            <span className="text-sm font-medium">Job title</span>
            <input className={fieldClass} defaultValue={contact?.jobTitle ?? ""} name="contactJobTitle" />
          </label>
          <label>
            <span className="text-sm font-medium">Email</span>
            <input className={fieldClass} defaultValue={contact?.email ?? ""} name="contactEmail" type="email" />
            <FieldError message={state.errors.contactEmail} />
          </label>
          <label>
            <span className="text-sm font-medium">Phone number</span>
            <input className={fieldClass} defaultValue={contact?.phone ?? ""} name="contactPhone" type="tel" />
            <FieldError message={state.errors.contactPhone} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <label className="text-lg font-semibold" htmlFor="notes">Relationship notes</label>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal meeting and relationship notes, up to 20,000 characters.
        </p>
        <textarea
          className={`${fieldClass} min-h-48`}
          defaultValue={client?.notes ?? ""}
          id="notes"
          name="notes"
        />
        <FieldError message={state.errors.notes} />
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        {state.duplicate ? (
          <Button disabled={pending} name="allowDuplicate" type="submit" value="true">
            {pending ? "Saving…" : client ? "Save anyway" : "Create anyway"}
          </Button>
        ) : (
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : client ? "Save changes" : "Create client"}
          </Button>
        )}
      </div>
    </form>
  );
}
