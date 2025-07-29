import Link from "next/link";

function BugIcon({ width, height }: { width: number; height: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={"hsl(243 76% 59%)"}
      stroke={"hsl(0 0% 97%)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-bug"
    >
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

interface LogoProps {
  text?: string;
  dark?: boolean;
}

export function Logo({ text }: Readonly<LogoProps>) {
  return (
    <Link
      className="flex justify-center items-center gap-2 hover:text-primary hover:outline-2 hover:outline-offset-4 focus:outline-dashed focus:outline-primary focus:outline-2 focus:outline-offset-4  rounded-sm"
      href="/"
    >
      {" "}
      <div
        className={
          "bg-button-background rounded-full p-2 flex items-center justify-center"
        }
      >
        <BugIcon width={24} height={24} />
      </div>
      <span className={`text-sm font-semibold pl-1`}>{text}</span>
    </Link>
  );
}
