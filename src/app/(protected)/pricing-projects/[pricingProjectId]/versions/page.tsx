import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingVersionHistoryScreen } from "@/presentation/screens/pricing/pricing-history-screen";

export default async function PricingVersionHistoryPage({ params }: { params: Promise<{ pricingProjectId: string }> }) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingVersionHistoryScreen companyId={user.companyId} pricingProjectId={(await params).pricingProjectId} />;
}
