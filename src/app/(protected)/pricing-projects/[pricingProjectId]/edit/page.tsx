import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingEditScreen } from "@/presentation/screens/pricing/pricing-editor-screen";

export default async function EditPricingProjectPage({ params }: { params: Promise<{ pricingProjectId: string }> }) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingEditScreen companyId={user.companyId} pricingProjectId={(await params).pricingProjectId} />;
}
