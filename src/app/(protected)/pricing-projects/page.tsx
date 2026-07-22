import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingProjectsScreen } from "@/presentation/screens/pricing/pricing-projects-screen";

export default async function PricingProjectsPage() {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingProjectsScreen companyId={user.companyId} />;
}
