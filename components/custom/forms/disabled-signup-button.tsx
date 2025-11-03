"use client";

import * as React from "react";
import { Button } from "../../ui/button";
import { ConfirmationModal } from "../../ui/confirmation-modal";

export function DisabledSignupButton() {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        Sign up
      </Button>
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
