"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Loader from "@/components/custom/loader";
import type { User } from "@supabase/supabase-js";

export function UserProfileLink() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
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
