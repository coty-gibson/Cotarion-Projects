"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/presentation/components/ui/button";
import { MICROSOFT_ENTRA_PROVIDER_ID } from "@/infrastructure/auth/microsoft-entra";

export function MicrosoftSignInButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Button
      type="button"
      disabled={!isMounted}
      onClick={() => signIn(MICROSOFT_ENTRA_PROVIDER_ID, { callbackUrl: "/" })}
    >
      Sign in with Microsoft
    </Button>
  );
}
