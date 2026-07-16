"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/presentation/components/ui/button";
import { DEVELOPMENT_AUTH_PROVIDER_ID } from "@/infrastructure/auth/dev-auth";

export function DevelopmentSignInButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Button
      type="button"
      disabled={!isMounted}
      onClick={() => signIn(DEVELOPMENT_AUTH_PROVIDER_ID, { callbackUrl: "/" })}
    >
      Development sign-in
    </Button>
  );
}
