"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import {
  createPricingProjectDraft,
  getPricingWorkspaceOptions,
  type PricingDraftInput,
  updatePricingProjectDraft
} from "@/application/pricing/pricing-workspace";
import type { PricingModelType } from "@/domain/pricing";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import {
  createPrismaPricingConfigurationRepository,
  createPrismaPricingProjectRepository,
  createPrismaServiceCatalogRepository
} from "@/infrastructure/database/pricing-repository";

export interface PricingWorkspaceFormState {
  messages: string[];
}

async function requireActiveUser() {
  const user = await getCurrentApplicationUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Authentication required.");
  return user;
}

function values(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is string => typeof value === "string");
}

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function draftFromFormData(formData: FormData): PricingDraftInput {
  const lineIds = values(formData, "lineId");
  const serviceIds = values(formData, "lineServiceId");
  const quantities = values(formData, "lineQuantity");
  const factorIds = values(formData, "complexityFactorId");
  const optionIds = values(formData, "complexityOptionId");
  const aopMonthValues = values(formData, "aopMonth");
  const aopAmounts = values(formData, "aopAmount");
  const aopNotes = values(formData, "aopNotes");

  return {
    projectName: value(formData, "projectName"),
    clientId: value(formData, "clientId"),
    pricingModel: value(formData, "pricingModel") as PricingModelType,
    lines: lineIds.map((lineId, index) => ({
      lineId,
      serviceCatalogItemId: serviceIds[index] ?? "",
      quantity: quantities[index] ?? ""
    })),
    complexitySelections: factorIds.map((factorId, index) => ({
      factorId,
      optionId: optionIds[index] ?? ""
    })),
    discountId: value(formData, "discountId"),
    retainerLevelId: value(formData, "retainerLevelId"),
    retainerTermId: value(formData, "retainerTermId"),
    fixedMonthlyPayment: value(formData, "fixedMonthlyPayment"),
    aopMonths: aopMonthValues.map((month, index) => ({
      month,
      adjustedOperatingProfit: aopAmounts[index] ?? "",
      adjustmentNotes: aopNotes[index] ?? ""
    })),
    advisoryDurationMinutes: value(formData, "advisoryDurationMinutes")
  };
}

async function workspaceOptions(companyId: string, pricingConfigurationVersionId?: string) {
  return getPricingWorkspaceOptions(
    companyId,
    createPrismaClientRepository(),
    createPrismaServiceCatalogRepository(),
    createPrismaPricingConfigurationRepository(),
    pricingConfigurationVersionId
  );
}

export async function createPricingProjectAction(
  _previousState: PricingWorkspaceFormState,
  formData: FormData
): Promise<PricingWorkspaceFormState> {
  const user = await requireActiveUser();
  const options = await workspaceOptions(user.companyId);
  const result = await createPricingProjectDraft(
    user.companyId,
    user.id,
    draftFromFormData(formData),
    options,
    createPrismaPricingProjectRepository()
  );
  if (!result.project) return { messages: result.validation.messages };

  revalidatePath("/");
  revalidatePath("/pricing-projects");
  redirect(`/pricing-projects/${result.project.id}?created=1`);
}

export async function updatePricingProjectAction(
  pricingProjectId: string,
  _previousState: PricingWorkspaceFormState,
  formData: FormData
): Promise<PricingWorkspaceFormState> {
  const user = await requireActiveUser();
  const repository = createPrismaPricingProjectRepository();
  const existing = await repository.findPricingProject(user.companyId, pricingProjectId);
  if (!existing) return { messages: ["Pricing Project not found."] };
  const options = await workspaceOptions(user.companyId, existing.pricingConfigurationVersionId);
  const result = await updatePricingProjectDraft(
    user.companyId,
    pricingProjectId,
    draftFromFormData(formData),
    options,
    repository
  );
  if (!result.project) return { messages: result.validation.messages };

  revalidatePath("/");
  revalidatePath("/pricing-projects");
  revalidatePath(`/pricing-projects/${pricingProjectId}`);
  redirect(`/pricing-projects/${pricingProjectId}?updated=1`);
}
