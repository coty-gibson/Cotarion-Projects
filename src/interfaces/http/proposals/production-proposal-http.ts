import { getServerSession } from "next-auth";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";
import { authOptions } from "@/infrastructure/auth/auth-options";
import { createProductionProposalServices } from "@/infrastructure/proposal-production-composition";
import type { ProposalHttpDependencies } from "@/interfaces/http/proposals/proposal-http-adapter";

let services: ReturnType<typeof createProductionProposalServices> | undefined;

export function productionProposalHttpDependencies(): ProposalHttpDependencies {
  services ??= createProductionProposalServices();
  return {
    authenticate: async () => getAuthenticatedIdentityFromSession(await getServerSession(authOptions)),
    services
  };
}
