import { isDevelopmentAuthEnabled } from "@/infrastructure/auth/dev-auth";
import { getMicrosoftEntraConfig } from "@/infrastructure/auth/microsoft-entra";
import { DevelopmentSignInButton } from "@/presentation/components/auth/development-sign-in-button";
import { MicrosoftSignInButton } from "@/presentation/components/auth/microsoft-sign-in-button";

const signInErrorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "This Microsoft account is not linked to an existing sign-in record. Try again after the temporary partial sign-in record has been cleared."
};

function getSignInErrorMessage(error: string | string[] | undefined) {
  const errorCode = Array.isArray(error) ? error[0] : error;

  if (!errorCode) {
    return null;
  }

  return signInErrorMessages[errorCode] ?? "Authentication could not be completed. Please try again.";
}

export default async function SignInPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const developmentAuthEnabled = isDevelopmentAuthEnabled();
  const microsoftEntraEnabled = Boolean(getMicrosoftEntraConfig());
  const resolvedSearchParams = await searchParams;
  const errorMessage = getSignInErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6">
        <p className="text-sm font-medium text-muted-foreground">Cotarion Platform</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Sign in</h1>
        {errorMessage ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          {microsoftEntraEnabled ? <MicrosoftSignInButton /> : null}
          {developmentAuthEnabled ? <DevelopmentSignInButton /> : null}
          {!microsoftEntraEnabled && !developmentAuthEnabled ? (
            <p className="text-sm leading-6 text-muted-foreground">
              No production sign-in provider is configured yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
