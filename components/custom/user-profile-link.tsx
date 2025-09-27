"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Loader from "@/components/custom/layout/loader";
import type { User } from "@supabase/supabase-js";
import { hasEnvVars } from "@/lib/utils";

export function UserProfileLink() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => (hasEnvVars ? createClient() : null), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      // No Supabase configuration; render nothing for profile link
      setLoading(false);
      return;
    }

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!mounted) {
    return null;
  }

  if (!supabase) {
    // If auth isn't configured, omit the profile UI entirely
    return null;
  }

  if (loading) {
    return <Loader text={"Loading..."} />;
  }

  return (
    <div>
      {user && (
        <div className="flex gap-2">
          <span className="font-medium">{user.email}</span>
        </div>
      )}
    </div>
  );
}
