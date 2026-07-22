import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingReviewHistoryScreen } from "@/presentation/screens/pricing/pricing-history-screen";

export default async function PricingReviewHistoryPage({ params }: { params: Promise<{ pricingProjectId: string }> }) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingReviewHistoryScreen companyId={user.companyId} pricingProjectId={(await params).pricingProjectId} />;
}
