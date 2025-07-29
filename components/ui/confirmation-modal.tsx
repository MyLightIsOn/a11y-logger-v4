import * as React from "react";
import { Button } from "./button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  triggerRef,
}: ConfirmationModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  // Handle ESC key to close the modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus management
  React.useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when modal opens
      cancelButtonRef.current?.focus();
    } else if (triggerRef?.current) {
      // Return focus to the trigger element when modal closes
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  // Prevent scrolling of the background when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={() => onClose()}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div
        className="relative bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent clicks on the content from closing the modal
      >
        <h2 
          id="confirmation-title" 
          className="text-xl font-semibold mb-4 text-primary"
        >
          {title}
        </h2>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex justify-end space-x-4">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            onClick={onClose}
          >
            {cancelButtonText}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}