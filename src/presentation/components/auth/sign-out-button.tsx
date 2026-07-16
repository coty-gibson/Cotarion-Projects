"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/presentation/components/ui/button";

export function SignOutButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={!isMounted}
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
    >
      Sign out
    </Button>
  );
}
