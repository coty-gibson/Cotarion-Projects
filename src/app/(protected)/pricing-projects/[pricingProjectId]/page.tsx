import { getCurrentApplicationUser } from "@/application/session/current-user";
import { PricingProjectDetailScreen } from "@/presentation/screens/pricing/pricing-project-detail-screen";

export default async function PricingProjectDetailPage({ params }: { params: Promise<{ pricingProjectId: string }> }) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <PricingProjectDetailScreen companyId={user.companyId} pricingProjectId={(await params).pricingProjectId} />;
}
