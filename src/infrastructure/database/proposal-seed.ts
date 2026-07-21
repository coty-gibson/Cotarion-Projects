import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1 } from "@/domain/proposals/engagement-type-policies";
import { prisma } from "@/infrastructure/database/prisma";

function policyJson(policy: (typeof CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1)[number]) {
  return structuredClone(policy) as unknown as Prisma.InputJsonValue;
}

function checksum(policy: (typeof CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1)[number]) {
  return createHash("sha256").update(JSON.stringify(policy)).digest("hex");
}

export class EngagementTypePolicyDriftError extends Error {
  constructor(code: string) {
    super(`Approved Consulting Engagement Type policy drift detected for ${code}.`);
    this.name = "EngagementTypePolicyDriftError";
  }
}

export async function ensureConsultingEngagementTypePolicies(
  companyId: string,
  client: PrismaClient = prisma
) {
  return client.$transaction(async (transaction) => {
    const group = await transaction.operatingGroup.upsert({
      where: { companyId_code: { companyId, code: "CONSULTING" } },
      create: { companyId, code: "CONSULTING", name: "Cotarion Consulting Group" },
      update: {},
      select: { id: true, name: true, active: true }
    });
    if (group.name !== "Cotarion Consulting Group" || !group.active) {
      throw new EngagementTypePolicyDriftError("OPERATING_GROUP");
    }

    for (const policy of CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1) {
      const policyChecksum = checksum(policy);
      const existing = await transaction.engagementTypePolicyVersion.findUnique({
        where: {
          operatingGroupId_code_policyVersion: {
            operatingGroupId: group.id,
            code: policy.code,
            policyVersion: policy.policyVersion
          }
        }
      });
      if (existing) {
        if (existing.policyChecksum !== policyChecksum || !existing.active) {
          throw new EngagementTypePolicyDriftError(policy.code);
        }
        continue;
      }
      await transaction.engagementTypePolicyVersion.create({
        data: {
          companyId,
          operatingGroupId: group.id,
          code: policy.code,
          policyVersion: policy.policyVersion,
          name: policy.name,
          proposalRequired: policy.proposalRequired,
          directEngagementPermitted: policy.directEngagementPermitted,
          agreementTemplateCode: policy.agreementTemplateCode,
          agreementTemplateName: policy.agreementTemplateName,
          billingMethod: policy.billingMethod,
          policy: policyJson(policy),
          policyChecksum,
          effectiveFrom: new Date("2026-07-20T00:00:00.000Z")
        }
      });
    }
    return group.id;
  });
}
