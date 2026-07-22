import { getCurrentApplicationUser } from "@/application/session/current-user";
import { ProposalListScreen } from "@/presentation/screens/proposals/proposal-list-screen";

export default async function ProposalsPage() {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <ProposalListScreen companyId={user.companyId} />;
}
