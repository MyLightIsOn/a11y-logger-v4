export function InputErrors({
  error,
}: {
  error?: string[] | null;
}): React.ReactNode {
  if (!error) return null;
  return error.map((err: string, index: number) => (
    <div
      key={index}
      className="bg-red-50 text-red-700 italic mt-1 p-2 rounded-md"
    >
      {err}
    </div>
  ));
}
