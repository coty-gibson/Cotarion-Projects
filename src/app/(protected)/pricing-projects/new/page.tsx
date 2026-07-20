import { createPricingProjectAction } from "@/app/(protected)/pricing-projects/actions";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { getPricingWorkspaceOptions } from "@/application/pricing/pricing-workspace";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import {
  createPrismaPricingConfigurationRepository,
  createPrismaServiceCatalogRepository
} from "@/infrastructure/database/pricing-repository";
import { seedPricingFoundation } from "@/infrastructure/database/pricing-seed";
import { PricingWorkspaceForm } from "@/presentation/components/pricing/pricing-workspace-form";

export default async function NewPricingProjectPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  await seedPricingFoundation(user.companyId);
  const options = await getPricingWorkspaceOptions(
    user.companyId,
    createPrismaClientRepository(),
    createPrismaServiceCatalogRepository(),
    createPrismaPricingConfigurationRepository()
  );
  const params = await searchParams;
  const requestedClientId = typeof params?.clientId === "string" ? params.clientId : "";
  const initialClientId = options.clients.some(({ id }) => id === requestedClientId)
    ? requestedClientId
    : options.clients[0]?.id;

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-medium text-muted-foreground">Pricing Projects</p>
      <h2 className="mt-2 text-3xl font-semibold">New Pricing Project</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Build and save a complete project estimate on one screen.
      </p>
      <PricingWorkspaceForm
        action={createPricingProjectAction}
        initialClientId={initialClientId}
        options={options}
      />
    </div>
  );
}
