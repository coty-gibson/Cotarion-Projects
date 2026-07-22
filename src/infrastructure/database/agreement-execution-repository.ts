import type { PrismaClient } from "@prisma/client";
import type { AgreementExecutionReadModel, AgreementExecutionRepository } from "@/application/agreements/execution-repository";
import { prisma } from "./prisma";

const include = { agreementVersion: true, signatureReferences: { include: { signatureEvidence: { include: { signatureRequest: true } } } }, events: { orderBy: { occurredAt: "asc" as const } } };
function map(raw: unknown): AgreementExecutionReadModel {
  const row = raw as { id: string; agreementId: string; executedAt: Date; executedByUserId: string; artifactChecksum: string; determination: string; agreementVersion: { versionNumber: number }; signatureReferences: { signatureEvidence: { id: string; occurredAt: Date; signatureRequest: { signerRole: string; signerDisplayName: string } } }[]; events: { eventType: string; occurredAt: Date; actorUserId: string }[] };
  return { id: row.id, agreementId: row.agreementId, agreementVersion: row.agreementVersion.versionNumber, executed: true, executedAt: row.executedAt.toISOString(), executedBy: row.executedByUserId, artifactChecksum: row.artifactChecksum, determination: row.determination as "ALL_REQUIRED_SIGNERS_SIGNED", signerSummary: row.signatureReferences.map(({ signatureEvidence }) => ({ role: signatureEvidence.signatureRequest.signerRole, displayName: signatureEvidence.signatureRequest.signerDisplayName, signedAt: signatureEvidence.occurredAt.toISOString(), signatureEvidenceReference: signatureEvidence.id })), history: row.events.map(event => ({ eventType: event.eventType, occurredAt: event.occurredAt.toISOString(), actorUserId: event.actorUserId })) };
}

export function createPrismaAgreementExecutionRepository(client: PrismaClient = prisma): AgreementExecutionRepository {
  return {
    async execute(input) {
      return client.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Agreement" WHERE "id" = ${input.agreementId} AND "companyId" = ${input.companyId} FOR UPDATE`;
        const existing = await tx.agreementExecution.findFirst({ where: { agreementId: input.agreementId, companyId: input.companyId }, include });
        if (existing) { if (existing.requestIdentity !== input.requestIdentity || existing.executedByUserId !== input.executedByUserId) throw new Error("Agreement execution identity conflicts with immutable evidence."); return { execution: map(existing), replay: true }; }
        const agreement = await tx.agreement.findFirst({ where: { id: input.agreementId, companyId: input.companyId, status: "READY_FOR_SIGNATURE" }, include: { versions: { where: { versionNumber: 1 }, include: { artifacts: true, signatureRequests: { include: { evidence: true } } } } } });
        const version = agreement?.versions[0];
        if (!agreement || !version || !version.signatureRequests.length) throw new Error("Agreement is not eligible for execution: required signatures are missing.");
        if (version.signatureRequests.some(request => request.status !== "SIGNED" || request.evidence?.outcome !== "SIGNED")) throw new Error("Agreement is not eligible for execution: every required signer must be signed.");
        const pdf = version.artifacts.find(artifact => artifact.artifactType === "PDF");
        if (!pdf || version.signatureRequests.some(request => request.agreementArtifactId !== pdf.id || request.artifactChecksum !== pdf.contentChecksum || request.evidence?.artifactChecksum !== pdf.contentChecksum)) throw new Error("Agreement is not eligible for execution: immutable artifact evidence does not match.");
        const signerSummary = version.signatureRequests.map(request => ({ role: request.signerRole, displayName: request.signerDisplayName, signatureEvidenceReference: request.evidence!.id, signedAt: request.evidence!.occurredAt.toISOString() }));
        const created = await tx.agreementExecution.create({ data: { id: input.id, companyId: input.companyId, agreementId: agreement.id, agreementVersionId: version.id, executedAt: new Date(input.executedAt), executedByUserId: input.executedByUserId, correlationId: input.correlationId, requestIdentity: input.requestIdentity, artifactChecksum: pdf.contentChecksum, determination: "ALL_REQUIRED_SIGNERS_SIGNED", signerSummary, signatureReferences: { create: version.signatureRequests.map(request => ({ companyId: input.companyId, signatureEvidenceId: request.evidence!.id })) }, events: { create: { id: `${input.id}-executed`, eventType: "AGREEMENT_EXECUTED", occurredAt: new Date(input.executedAt), actorUserId: input.executedByUserId, correlationId: input.correlationId, evidence: { determination: "ALL_REQUIRED_SIGNERS_SIGNED", signerCount: signerSummary.length, artifactChecksum: pdf.contentChecksum } } } }, include });
        return { execution: map(created), replay: false };
      });
    },
    async detail(companyId, agreementId) { const row = await client.agreementExecution.findFirst({ where: { companyId, agreementId }, include }); return row ? map(row) : null; },
    async list(companyId, agreementId) { return (await client.agreementExecution.findMany({ where: { companyId, agreementId }, orderBy: { executedAt: "desc" }, include })).map(map); },
    async eligibility(companyId, agreementId) { const agreement = await client.agreement.findFirst({ where: { id: agreementId, companyId }, include: { versions: { where: { versionNumber: 1 }, include: { signatureRequests: { include: { evidence: true } }, artifacts: true } } } }); const version = agreement?.versions[0]; if (!agreement || agreement.status !== "READY_FOR_SIGNATURE" || !version) return { eligible: false, reason: "AGREEMENT_NOT_READY" }; if (!version.signatureRequests.length) return { eligible: false, reason: "SIGNATURES_MISSING" }; if (version.signatureRequests.some(request => request.status !== "SIGNED" || request.evidence?.outcome !== "SIGNED")) return { eligible: false, reason: "SIGNATURES_INCOMPLETE" }; const pdf = version.artifacts.find(artifact => artifact.artifactType === "PDF"); if (!pdf || version.signatureRequests.some(request => request.artifactChecksum !== pdf.contentChecksum || request.evidence?.artifactChecksum !== pdf.contentChecksum)) return { eligible: false, reason: "ARTIFACT_MISMATCH" }; return { eligible: true, reason: "ALL_REQUIRED_SIGNERS_SIGNED" }; },
  };
}
