import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import type { Metadata } from "next";
import { Fira_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Toaster } from 'sonner';
import { ThemeProvider } from "@/components/theme-provider"
import SwitchDualIconLabelDemo from '../components/io/ThemeToggle';
import IAButton from "@/components/IAButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: "700"
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Librain",
  description: "Para mentes abiertas",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const isLoggedIn = Boolean(session?.session);

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${firaSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen={isLoggedIn} className="w-full flex">
            {isLoggedIn && <AppSidebar />}
            <main className="flex-1 flex gap-5">
              {isLoggedIn && <SidebarTrigger />}
              <div className="flex-1 pr-1">
                {children}
                {isLoggedIn && <IAButton className="fixed bottom-4 right-4"/>}
                <Toaster/>
              </div>
            </main>
          </SidebarProvider>
          <SwitchDualIconLabelDemo className="fixed top-5 right-5"/>
        </ThemeProvider>
      </body>
    </html>
  );
}
