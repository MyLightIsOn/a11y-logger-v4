import Link from "next/link";
import { Button } from "../ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { DisabledSignupButton } from "./disabled-signup-button";
import type React from "react";

// Keep async server component behavior but present a React component type to TS.
const AuthButtonImpl = async () => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <DisabledSignupButton />
    </div>
  );
};

export const AuthButton = AuthButtonImpl as unknown as React.FC;
