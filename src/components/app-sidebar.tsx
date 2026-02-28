import LogoutButton from "./Auth/LogoutButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Home,
  Info,
  ChevronRight,
} from "lucide-react";

function getInitials(name?: string | null, email?: string | null) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

const navMain = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
  },
  {
    label: "About Us",
    href: "/about",
    icon: Info,
  },
];

export async function AppSidebar() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const avatarSrc = user?.image ?? "/auth/default.png";
  const initials = getInitials(user?.name, user?.email);

  return (
    <Sidebar className="border-r border-border bg-background" style={{ overflowX: 'hidden' }}>
      {/* ── Header: Avatar + user info ─────────────────────── */}
      <SidebarHeader className="px-4 py-5" style={{ overflowX: 'hidden' }}>
        <Link
          href="/profile"
          className="group flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-all hover:border-primary/30 hover:bg-muted/70"
        >
          <div className="relative">
            <span className="absolute -inset-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
            <Avatar className="relative h-9 w-9 border-2 border-background">
              <AvatarImage src={avatarSrc} alt={user?.name ?? "Avatar"} />
              <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-foreground leading-tight">
              {user?.name ?? "Usuario"}
            </span>
            <span className="truncate text-xs text-muted-foreground leading-tight">
              {user?.email ?? ""}
            </span>
          </div>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Content ────────────────────────────────────────── */}
      <SidebarContent className="px-3 py-3" style={{ overflowX: 'hidden' }}>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-all hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      {label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-1" />

      </SidebarContent>

      <SidebarSeparator />

      {/* ── Footer ─────────────────────────────────────────── */}
      <SidebarFooter className="px-4 py-4" style={{ overflowX: 'hidden' }}>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}