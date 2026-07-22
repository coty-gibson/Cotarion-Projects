import type { PrismaClient } from "@prisma/client";
import { ProposalApplicationService } from "@/application/proposals/proposal-application-service";
import {
  DefaultProposalCapabilityEvaluator
} from "@/application/proposals/proposal-capabilities";
import { ProposalQueryService } from "@/application/proposals/proposal-query-service";
import { ProposalRepresentationService } from "@/application/proposals/proposal-representation-service";
import { ProposalRepresentationQueryService } from "@/application/proposals/proposal-representation-query-service";
import { ProposalDeliveryService } from "@/application/proposals/proposal-delivery-service";
import { ProposalDeliveryQueryService } from "@/application/proposals/proposal-delivery-query-service";
import { ProposalDeliveryPublicService } from "@/application/proposals/proposal-delivery-public-service";
import {
  createPrismaProposalActorContextProvider,
  createPrismaProposalAuthorityProvider
} from "@/infrastructure/database/proposal-authority-adapters";
import {
  createPrismaProposalReadRepository,
  createPrismaProposalUnitOfWork
} from "@/infrastructure/database/proposal-repository";
import { prisma } from "@/infrastructure/database/prisma";
import { createPrismaProposalPricingVersionResolver } from "@/infrastructure/database/proposal-pricing-version-resolver";
import { createPrismaProposalRepresentationRepository } from "@/infrastructure/database/proposal-representation-repository";
import { ProposalRepresentationRenderer } from "@/infrastructure/proposal-representations/proposal-representation-renderer";
import { createPrismaProposalDeliveryRepository } from "@/infrastructure/database/proposal-delivery-repository";
import { HmacProposalDeliveryTokenIssuer } from "@/infrastructure/proposal-deliveries/hmac-proposal-delivery-token-issuer";
import { createPrismaProposalClientDecisionRepository } from "@/infrastructure/database/proposal-client-decision-repository";
import { ProposalClientDecisionPublicService } from "@/application/proposals/proposal-client-decision-public-service";
import { ProposalClientDecisionQueryService } from "@/application/proposals/proposal-client-decision-query-service";
import { AgreementService } from "@/application/agreements/agreement-service";
import { AgreementQueryService } from "@/application/agreements/agreement-query-service";
import { createPrismaAgreementRepository } from "@/infrastructure/database/agreement-repository";
import { DefaultAgreementRenderer } from "@/infrastructure/agreements/agreement-renderer";
import { createPrismaSignatureRepository } from "@/infrastructure/database/signature-repository";
import { HmacSignatureProvider } from "@/infrastructure/agreements/hmac-signature-provider";
import { SignatureService } from "@/application/agreements/signature-service";
import { SignatureQueryService } from "@/application/agreements/signature-query-service";
import { SignaturePublicService } from "@/application/agreements/signature-public-service";
import { AgreementExecutionService } from "@/application/agreements/execution-service";
import { AgreementExecutionQueryService } from "@/application/agreements/execution-query-service";
import { createPrismaAgreementExecutionRepository } from "@/infrastructure/database/agreement-execution-repository";

export function createProductionProposalServices(client: PrismaClient = prisma) {
  const actors = createPrismaProposalActorContextProvider(client);
  const capabilities = new DefaultProposalCapabilityEvaluator(
    createPrismaProposalAuthorityProvider(client)
  );
  const readRepository = createPrismaProposalReadRepository(client);
  const representationRepository = createPrismaProposalRepresentationRepository(client);
  const deliveryRepository = createPrismaProposalDeliveryRepository(client);
  const decisionRepository = createPrismaProposalClientDecisionRepository(client);
  const agreementRepository = createPrismaAgreementRepository(client);
  const signatureRepository = createPrismaSignatureRepository(client);
  const executionRepository = createPrismaAgreementExecutionRepository(client);
  const deliverySecret = process.env.PROPOSAL_DELIVERY_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!deliverySecret) throw new Error("PROPOSAL_DELIVERY_SECRET or NEXTAUTH_SECRET is required.");
  const tokenIssuer = new HmacProposalDeliveryTokenIssuer(deliverySecret);
  const signatureProvider = new HmacSignatureProvider(process.env.AGREEMENT_SIGNATURE_SECRET ?? deliverySecret);
  return {
    application: new ProposalApplicationService({
      actors,
      capabilities,
      unitOfWork: createPrismaProposalUnitOfWork(client),
      pricingVersions: createPrismaProposalPricingVersionResolver(client)
    }),
    queries: new ProposalQueryService(actors, readRepository, capabilities),
    representations: new ProposalRepresentationService(actors, capabilities, representationRepository, new ProposalRepresentationRenderer()),
    representationQueries: new ProposalRepresentationQueryService(actors, representationRepository),
    deliveries: new ProposalDeliveryService(actors, capabilities, deliveryRepository, tokenIssuer),
    deliveryQueries: new ProposalDeliveryQueryService(actors, capabilities, deliveryRepository),
    publicDeliveries: new ProposalDeliveryPublicService(deliveryRepository, tokenIssuer),
    publicDecisions: new ProposalClientDecisionPublicService(decisionRepository, tokenIssuer),
    decisionQueries: new ProposalClientDecisionQueryService(actors, capabilities, decisionRepository),
    agreements: new AgreementService(actors, capabilities, agreementRepository, new DefaultAgreementRenderer()),
    agreementQueries: new AgreementQueryService(actors, capabilities, agreementRepository),
    signatures: new SignatureService(actors, capabilities, signatureRepository, signatureProvider),
    signatureQueries: new SignatureQueryService(actors, capabilities, signatureRepository),
    publicSignatures: new SignaturePublicService(signatureRepository, signatureProvider),
    executions: new AgreementExecutionService(actors, capabilities, executionRepository),
    executionQueries: new AgreementExecutionQueryService(actors, capabilities, executionRepository)
  };
}
