import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import QueryClientContainer from "@/components/custom/query-client-container";
import Header from "@/components/custom/layout/header";
import Footer from "@/components/custom/layout/footer";
import "./globals.css";
import { serverEnv } from "@/lib/env";

const defaultUrl = serverEnv.VERCEL_URL
  ? `https://${serverEnv.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "A11y Bug Logger",
  description: "A11y Bug Logger",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientContainer>
            <div className="fixed z-50 top-2 left-2 transition-transform duration-200 transform -translate-y-20 focus-within:translate-y-0">
              <div className="flex gap-2 bg-background p-4 border-primary border-2">
                <a
                  href="#nav"
                  className="bg-button-background text-button-foreground px-4 py-2 rounded-md text-sm font-medium focus:outline-dashed focus:ring-2 focus:ring-offset-4 focus:bg-white focus:text-primary focus:underline focus:outline-primary"
                >
                  Skip to Nav
                </a>
                <a
                  href="#main"
                  className="bg-button-background text-button-foreground px-4 py-2 rounded-md text-sm font-medium focus:outline-dashed focus:ring-2 focus:ring-offset-4 focus:bg-white focus:text-primary focus:underline focus:outline-primary focus:border-black"
                >
                  Skip to Main
                </a>
              </div>
            </div>
            <Header />
            {children}
            <Footer />
          </QueryClientContainer>
        </ThemeProvider>
      </body>
    </html>
  );
}
