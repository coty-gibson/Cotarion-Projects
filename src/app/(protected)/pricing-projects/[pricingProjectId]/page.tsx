import { notFound } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { getPricingProjectDetail } from "@/application/pricing/pricing-workspace";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import {
  createPrismaPricingConfigurationRepository,
  createPrismaPricingProjectRepository,
  createPrismaServiceCatalogRepository
} from "@/infrastructure/database/pricing-repository";
import { PricingProjectDetailScreen } from "@/presentation/screens/pricing/pricing-project-detail-screen";

export default async function PricingProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ pricingProjectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const { pricingProjectId } = await params;
  const detail = await getPricingProjectDetail(
    user.companyId,
    pricingProjectId,
    createPrismaClientRepository(),
    createPrismaServiceCatalogRepository(),
    createPrismaPricingConfigurationRepository(),
    createPrismaPricingProjectRepository()
  );
  if (!detail) notFound();
  const query = await searchParams;

  return (
    <PricingProjectDetailScreen
      notice={
        query?.created === "1"
          ? "Pricing Project created and saved as Draft."
          : query?.updated === "1"
            ? "Draft saved successfully."
            : undefined
      }
      {...detail}
    />
  );
}
