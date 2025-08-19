import * as React from "react";
import { Button } from "../ui/button";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  alt,
  triggerRef,
}: ImageModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

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
      // Focus the close button when modal opens
      closeButtonRef.current?.focus();
    } else if (triggerRef.current) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={() => onClose()}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent clicks on the content from closing the modal
      >
        <Button
          ref={closeButtonRef}
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white hover:bg-black hover:bg-opacity-70"
          onClick={onClose}
          aria-label="Close image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 11.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
        <div className="relative w-full h-[90vh]" id="modal-title">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            style={{ objectFit: "contain" }}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
