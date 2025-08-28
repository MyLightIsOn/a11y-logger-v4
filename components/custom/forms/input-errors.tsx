import type React from "react";

export function InputErrors({
  error,
}: {
  error?: string[] | null;
}): React.ReactElement | null {
  if (!error || error.length === 0) return null;
  return (
    <>
      {error.map((err: string, index: number) => (
        <div
          key={index}
          className="bg-red-50 text-red-700 italic mt-1 p-2 rounded-md"
        >
          {err}
        </div>
      ))}
    </>
  );
}
