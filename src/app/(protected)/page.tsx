import { getCurrentApplicationUser } from "@/application/session/current-user";
import { getClientDashboard } from "@/application/clients/client-service";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import { ClientDashboardScreen } from "@/presentation/screens/clients/client-dashboard-screen";

export default async function Home() {
  const currentUser = await getCurrentApplicationUser();
  if (!currentUser) return null;
  const dashboard = await getClientDashboard(
    createPrismaClientRepository(),
    currentUser.companyId
  );
  return <ClientDashboardScreen {...dashboard} />;
}
