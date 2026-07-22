import { ProposalClientDecisionScreen } from "@/presentation/screens/proposals/proposal-client-decision-screen";
export default async function ProposalDeliveryPage({ params }: { params: Promise<{ token: string }> }) { return <ProposalClientDecisionScreen token={(await params).token} />; }
