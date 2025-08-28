"use client";

import * as React from "react";
import { ConfirmationModal } from "../../ui/confirmation-modal";

export function DisabledSignupLink() {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="underline underline-offset-4 text-primary hover:underline"
      >
        Sign up
      </button>
      <ConfirmationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          /* no-op */
        }}
        title="Signups disabled"
        message="This is a prototype app. Signups are currently disabled. Credentials are on the login page."
        confirmButtonText="OK"
        cancelButtonText="Close"
        triggerRef={triggerRef}
      />
    </>
  );
}
