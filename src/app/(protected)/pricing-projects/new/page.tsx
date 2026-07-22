import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingCreateScreen } from "@/presentation/screens/pricing/pricing-editor-screen";

export default async function NewPricingProjectPage() {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingCreateScreen companyId={user.companyId} />;
}
