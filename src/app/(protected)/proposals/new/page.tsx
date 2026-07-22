import { getCurrentApplicationUser } from "@/application/session/current-user";
import { ProposalCreateScreen } from "@/presentation/screens/proposals/proposal-create-screen";

export default async function NewProposalPage() {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  return <ProposalCreateScreen companyId={user.companyId} />;
}
