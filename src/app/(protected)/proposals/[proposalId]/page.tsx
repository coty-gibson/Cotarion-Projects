import { getCurrentApplicationUser } from "@/application/session/current-user";
import { ProposalDetailScreen } from "@/presentation/screens/proposals/proposal-detail-screen";

export default async function ProposalDetailPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <ProposalDetailScreen companyId={user.companyId} proposalId={(await params).proposalId} />;
}
