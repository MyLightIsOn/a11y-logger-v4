"use client";

import { useActionState } from "react";
import {
  CardTitle,
  CardHeader,
  CardContent,
  CardFooter,
  Card,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputErrors } from "@/components/custom/input-errors";
import { SubmitButton } from "@/components/custom/submit-button";
import { loginUserAction } from "@/data/actions/auth-actions";

interface LoginFormState {
  zodErrors?: Record<string, string[]> | null;
  message?: string;
}

const INITIAL_STATE: LoginFormState = {
  zodErrors: null,
  message: undefined,
};

import React from "react";

function Signin(): React.ReactElement {
  const [formState, formAction] = useActionState<LoginFormState, FormData>(
    loginUserAction,
    INITIAL_STATE,
  );

  return (
    <div className="w-full max-w-md">
      <form action={formAction}>
        <Card className={"border border-border shadow-md"}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center font-bold">
              Sign In to A11y Bug Logger!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="email"
                autoComplete="email"
              />
              <InputErrors error={formState?.zodErrors?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="password"
              />
              <InputErrors error={formState?.zodErrors?.password} />
            </div>
            <InputErrors error={formState?.zodErrors?.message} />
          </CardContent>
          <CardFooter className="flex flex-col pt-5">
            <SubmitButton
              className="w-full"
              text="Sign In"
              loadingText="Loading"
            />
          </CardFooter>
        </Card>
        {/*<div className="mt-4 text-center text-sm">
          Don't have an account?
          <Link className="underline ml-2" href="signup">
            Sign Up
          </Link>
        </div>*/}
      </form>
    </div>
  );
}

export default Signin;
