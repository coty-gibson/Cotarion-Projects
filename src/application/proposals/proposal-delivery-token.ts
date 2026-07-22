export interface ProposalDeliveryTokenIssuer {
  issue(companyId: string, requestIdentity: string): { readonly token: string; readonly digest: string };
  digest(token: string): string;
}
