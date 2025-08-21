import { NextLogo } from "./next-logo";
import { SupabaseLogo } from "./supabase-logo";
import { AuthButton } from "@/components/auth-button";
import React from "react";

export function Hero() {
  return (
    <div className="flex flex-col gap-8 items-center">
      <div className="flex gap-8 justify-center items-center">
        <a
          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
          target="_blank"
          rel="noreferrer"
        >
          <SupabaseLogo />
        </a>
        <span className="border-l rotate-45 h-6" />
        <a href="https://nextjs.org/" target="_blank" rel="noreferrer">
          <NextLogo />
        </a>
      </div>
      <h1 className="sr-only">Supabase and Next.js Starter Template</h1>
      <p className="text-3xl lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
        Prototype for an <span className={"font-bold"}>AI driven</span>{" "}
        accessibility bug logger.
      </p>
      <p className="text-lg lg:text-xl !leading-tight mx-auto max-w-xl text-center">
        This tool uses Generative AI to speed up logging issues and creating
        reports. Credentials are on the login page. <br />
        <br />
        <a
          className={"underline cursor-pointer"}
          href={"https://thelawrencemoore.com/a11y-logger.html"}
        >
          Read Case Study
        </a>
      </p>
      <p>⚠️ Pardon the mess, this is a work in progress.</p>
      <AuthButton />
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
