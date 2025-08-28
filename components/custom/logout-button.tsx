"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant={"ghost"}
      className="flex gap-3 w-fit rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
      onClick={logout}
    >
      Logout
    </Button>
  );
}
