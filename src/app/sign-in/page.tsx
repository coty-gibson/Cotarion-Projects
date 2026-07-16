import { isDevelopmentAuthEnabled } from "@/infrastructure/auth/dev-auth";
import { DevelopmentSignInButton } from "@/presentation/components/auth/development-sign-in-button";

export default function SignInPage() {
  const developmentAuthEnabled = isDevelopmentAuthEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6">
        <p className="text-sm font-medium text-muted-foreground">Cotarion Platform</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Sign in</h1>
        <div className="mt-6">
          {developmentAuthEnabled ? (
            <DevelopmentSignInButton />
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No production sign-in provider is configured yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
