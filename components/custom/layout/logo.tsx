import Link from "next/link";

function ProgramIcon({ width, height }: { width: number; height: number }) {
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
      className="icon icon-tabler icons-tabler-outline icon-tabler-device-desktop-analytics"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 4m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z" />
      <path d="M7 20h10" />
      <path d="M9 16v4" />
      <path d="M15 16v4" />
      <path d="M9 12v-4" />
      <path d="M12 12v-1" />
      <path d="M15 12v-2" />
      <path d="M12 12v-1" />
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
      className="flex justify-center items-center gap-2  rounded-sm a11y-focus"
      href="/"
    >
      {" "}
      <div
        className={
          "bg-button-background rounded-full p-2 flex items-center justify-center"
        }
      >
        <ProgramIcon width={24} height={24} />
      </div>
      <span className={`text-sm font-semibold pl-1`}>{text}</span>
    </Link>
  );
}
