import Link from "next/link";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { listCompanyPricingProjects } from "@/application/pricing/pricing-workspace";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import { createPrismaPricingProjectRepository } from "@/infrastructure/database/pricing-repository";
import { PricingProjectsScreen } from "@/presentation/screens/pricing/pricing-projects-screen";
import { Button } from "@/presentation/components/ui/button";

export default async function PricingProjectsPage() {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const projects = await listCompanyPricingProjects(
    user.companyId,
    createPrismaClientRepository(),
    createPrismaPricingProjectRepository()
  );

  return (
    <PricingProjectsScreen
      action={
        <Button asChild>
          <Link href="/pricing-projects/new">New Pricing Project</Link>
        </Button>
      }
      projects={projects}
    />
  );
}
