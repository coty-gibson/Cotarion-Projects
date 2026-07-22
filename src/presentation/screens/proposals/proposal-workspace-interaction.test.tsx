// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProposalApiClient,
  type ProposalDetailDto,
  type ProposalPermittedActionsDto,
  WorkspaceApiError
} from "@/presentation/api/proposal-api-client";
import { ProposalDetailScreen } from "./proposal-detail-screen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const none: ProposalPermittedActionsDto = {
  generateRepresentation: false,
  createDelivery: false,
  attachPricingVersion: false,
  updateDraft: false,
  saveVersion: false,
  requestQualityReview: false,
  submitForExecutiveAuthorization: false,
  approve: false,
  reject: false,
  requestChanges: false,
  submitThroughQualityReview: false,
  submitThroughExecutiveAuthorization: false,
  recordViewed: false,
  recordClientAcceptance: false,
  recordVerbalAcceptance: false,
  withdrawAcceptance: false,
  linkExecutedAgreement: false,
  decline: false,
  expire: false,
  createReplacement: false,
  supersede: false,
  archive: false
};
function proposal(permittedActions: ProposalPermittedActionsDto): ProposalDetailDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    concurrencyToken: "proposal-token",
    proposalNumber: "PRO-000001",
    companyId: "company-1",
    clientId: "client-1",
    ownerId: "owner-1",
    title: "Confirmed state",
    status: "DRAFT",
    currentVersionNumber: 1,
    submittedVersionNumber: null,
    versionCount: 1,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
    effectiveAt: null,
    closedAt: null,
    engagementTypeCode: "PROJECT",
    currentVersionId: "version-1",
    submittedVersionId: null,
    supersedesProposalId: null,
    supersededByProposalId: null,
    executedAgreementId: null,
    expirationAt: "2026-09-01T10:00:00.000Z",
    draft: {
      title: "Confirmed state",
      structuredContent: { schemaVersion: 1, title: "Confirmed state", sections: [] },
      commercialTerms: {
        paymentSchedule: "",
        billingMethod: "",
        depositTerms: "",
        recurrenceAndTerm: "",
        cancellationSummary: "",
        assumptionsAndExclusions: "",
        clientResponsibilities: "",
        offerNotes: ""
      },
      recipients: [],
      pricingSnapshot: {
        pricingProjectId: "pricing-1",
        pricingProjectNumber: "PP-1",
        pricingModel: "PROJECT",
        methodologyVersion: "1",
        engineVersion: "1",
        pricingConfigurationVersion: 1,
        approvedAt: "2026-07-20T10:00:00.000Z",
        approvedByUserId: "reviewer-1",
        outputSnapshot: {}
      },
      expirationAt: "2026-09-01T10:00:00.000Z",
      expirationOverrideReason: null
    },
    versions: [
      {
        id: "version-1",
        number: 1,
        status: "SAVED",
        createdAt: "2026-07-21T10:00:00.000Z",
        createdByUserId: "owner-1",
        revisionReason: null,
        submittedAt: null,
        submittedByUserId: null
      }
    ],
    review: {
      status: "NOT_REQUESTED",
      requestedAt: null,
      requestedByUserId: null,
      reviewedAt: null,
      reviewedByUserId: null,
      outcome: null
    },
    executiveAuthorization: {
      status: "NOT_USED",
      submittedAt: null,
      submittedByUserId: null,
      authorizedAt: null,
      authorizedByUserId: null,
      businessJustification: null
    },
    acceptance: {
      viewedAt: null,
      acceptances: [],
      withdrawals: [],
      declinedAt: null,
      executedAgreementId: null
    },
    timeline: [],
    permittedActions
  };
}

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});
async function renderScreen(initial: ProposalDetailDto) {
  vi.spyOn(ProposalApiClient.prototype, "load").mockResolvedValue(initial);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<ProposalDetailScreen companyId="company-1" proposalId={initial.id} />);
  });
  return host;
}

describe("Proposal workspace command state", () => {
  it("replaces local state with response.proposal and immediately uses refreshed permissions", async () => {
    const initial = proposal({ ...none, saveVersion: true });
    const refreshed = {
      ...proposal({ ...none, requestQualityReview: true }),
      title: "Server refreshed title"
    };
    vi.spyOn(ProposalApiClient.prototype, "saveVersion").mockResolvedValue({
      proposal: refreshed,
      idempotentReplay: false
    });
    const container = await renderScreen(initial);
    await act(async () => {
      (
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Save Version"
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (container.querySelector("form.proposal-command-dialog") as HTMLFormElement).requestSubmit();
    });
    expect(container.textContent).toContain("Server refreshed title");
    expect(container.textContent).toContain("Request Quality Review");
    expect(container.textContent).not.toContain("Save Version");
  });

  it("does not navigate for a command returning the route Proposal", async () => {
    window.history.replaceState(null, "", `/proposals/${proposal({ ...none }).id}`);
    const initial = proposal({ ...none, saveVersion: true });
    vi.spyOn(ProposalApiClient.prototype, "saveVersion").mockResolvedValue({
      proposal: { ...initial, permittedActions: none },
      idempotentReplay: false
    });
    const navigation = vi.spyOn(window.history, "pushState");
    const container = await renderScreen(initial);
    await act(async () => {
      (
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Save Version"
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (container.querySelector("form.proposal-command-dialog") as HTMLFormElement).requestSubmit();
    });
    expect(navigation).not.toHaveBeenCalled();
  });

  it("keeps replacement response state and navigates to its canonical route, including idempotent replay", async () => {
    const initial = proposal({ ...none, createReplacement: true });
    const replacement = {
      ...proposal(none),
      id: "22222222-2222-4222-8222-222222222222",
      proposalNumber: "PRO-000002",
      title: "Replacement state"
    };
    vi.spyOn(ProposalApiClient.prototype, "createReplacement").mockResolvedValue({
      proposal: replacement,
      idempotentReplay: true
    });
    const container = await renderScreen(initial);
    await act(async () => {
      (
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Create replacement"
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (container.querySelector("form.proposal-command-dialog") as HTMLFormElement).requestSubmit();
    });
    expect(window.location.pathname).toBe(`/proposals/${replacement.id}`);
    expect(container.textContent).toContain("Replacement state");

    const routeIdAfterRefresh = window.location.pathname.split("/").at(-1)!;
    const load = vi.mocked(ProposalApiClient.prototype.load);
    load.mockClear();
    load.mockResolvedValue(replacement);
    await act(async () => {
      root?.unmount();
      root = createRoot(host!);
      root.render(<ProposalDetailScreen companyId="company-1" proposalId={routeIdAfterRefresh} />);
    });
    expect(load).toHaveBeenCalledWith(replacement.id);
    expect(host?.textContent).toContain("Replacement state");
  });

  it("moves focus into the dialog, traps focus, closes with Escape, and restores opener focus", async () => {
    const container = await renderScreen(proposal({ ...none, saveVersion: true }));
    const opener = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Save Version"
    ) as HTMLButtonElement;
    opener.focus();
    await act(async () => {
      opener.click();
    });
    const dialog = container.querySelector("[role=dialog]") as HTMLDivElement;
    const initial = dialog.querySelector("[data-initial-focus]") as HTMLElement;
    expect(document.activeElement).toBe(initial);
    expect(
      Array.from(dialog.parentElement!.children)
        .filter((element) => element !== dialog)
        .every((element) => (element as HTMLElement).inert)
    ).toBe(true);
    const buttons = dialog.querySelectorAll("button");
    const last = buttons.item(buttons.length - 1);
    last.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(initial);
    initial.focus();
    initial.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("preserves confirmed state on errors and prevents duplicate submission while pending", async () => {
    const initial = proposal({ ...none, archive: true });
    let reject!: (error: Error) => void;
    const pending = new Promise<never>((_, failure) => {
      reject = failure;
    });
    const archive = vi.spyOn(ProposalApiClient.prototype, "archive").mockReturnValue(pending);
    const container = await renderScreen(initial);
    await act(async () => {
      (
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Archive Proposal"
        ) as HTMLButtonElement
      ).click();
    });
    const form = container.querySelector("form.proposal-command-dialog") as HTMLFormElement;
    act(() => {
      form.requestSubmit();
      form.requestSubmit();
    });
    expect(archive).toHaveBeenCalledOnce();
    const dialog = container.querySelector("[role=dialog]") as HTMLDivElement;
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
    await act(async () => {
      reject(new WorkspaceApiError("DOMAIN_RULE_VIOLATION", "Proposal cannot be archived.", 409));
      try {
        await pending;
      } catch {}
    });
    expect(container.textContent).toContain("Confirmed state");
    expect(container.textContent).toContain("Proposal cannot be archived.");
  });
});
