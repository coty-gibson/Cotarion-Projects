import { notFound } from "next/navigation";
import { updatePricingProjectAction } from "@/app/(protected)/pricing-projects/actions";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import {
  getPricingProjectDetail,
  getPricingWorkspaceOptions
} from "@/application/pricing/pricing-workspace";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import {
  createPrismaPricingConfigurationRepository,
  createPrismaPricingProjectRepository,
  createPrismaServiceCatalogRepository
} from "@/infrastructure/database/pricing-repository";
import { PricingWorkspaceForm } from "@/presentation/components/pricing/pricing-workspace-form";

export default async function EditPricingProjectPage({
  params
}: {
  params: Promise<{ pricingProjectId: string }>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const { pricingProjectId } = await params;
  const clientRepository = createPrismaClientRepository();
  const catalogRepository = createPrismaServiceCatalogRepository();
  const configurationRepository = createPrismaPricingConfigurationRepository();
  const projectRepository = createPrismaPricingProjectRepository();
  const detail = await getPricingProjectDetail(
    user.companyId,
    pricingProjectId,
    clientRepository,
    catalogRepository,
    configurationRepository,
    projectRepository
  );
  if (!detail || detail.project.status !== "DRAFT") notFound();
  const options = await getPricingWorkspaceOptions(
    user.companyId,
    clientRepository,
    catalogRepository,
    configurationRepository,
    detail.project.pricingConfigurationVersionId
  );
  const modelInput =
    detail.project.pricingInputSnapshot && typeof detail.project.pricingInputSnapshot === "object"
      ? (detail.project.pricingInputSnapshot as {
          retainerLevelId?: string;
          retainerTermId?: string;
          fixedMonthlyPayment?: string;
          aopMonths?: { month: string; adjustedOperatingProfit: string; adjustmentNotes: string }[];
          advisoryDurationMinutes?: string;
        })
      : {};

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-medium text-muted-foreground">
        {detail.project.estimateNumber} · Draft
      </p>
      <h2 className="mt-2 text-3xl font-semibold">Edit Pricing Project</h2>
      <PricingWorkspaceForm
        action={updatePricingProjectAction.bind(null, pricingProjectId)}
        initialDraft={{
          projectName: detail.project.projectName,
          clientId: detail.project.clientId,
          pricingModel: detail.project.pricingModel,
          lines: detail.project.lines.map((line) => ({
            lineId: line.id,
            serviceCatalogItemId: line.serviceCatalogItemId,
            quantity: line.quantity
          })),
          complexitySelections: detail.project.complexitySelections.map((selection) => ({
            factorId: selection.factorCode,
            optionId: selection.optionCode
          })),
          discountId: detail.project.discountSelection?.discountCode ?? "none",
          retainerLevelId: modelInput.retainerLevelId ?? "advisory",
          retainerTermId: modelInput.retainerTermId ?? "3-month",
          fixedMonthlyPayment: modelInput.fixedMonthlyPayment ?? "0.00",
          aopMonths: modelInput.aopMonths ?? [],
          advisoryDurationMinutes: modelInput.advisoryDurationMinutes ?? "30"
        }}
        lockClient
        options={options}
        pricingProjectId={pricingProjectId}
      />
    </div>
  );
}
