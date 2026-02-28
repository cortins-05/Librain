"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck, CalendarClock, Mail, Sparkles, User } from "lucide-react";

interface ProfileClientProps {
  name: string;
  email: string;
  image: string;
  preferences: string[];
  joinedDate: string;
}

function getInitials(name: string, email: string) {
  if (name && name.trim().length > 0 && name !== "Anonymous User") {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }
  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

export default function ProfileClient({
  name,
  email,
  image,
  preferences,
  joinedDate,
}: ProfileClientProps) {
  // If image is empty or explicitly the default path, point to /auth/default.png
  // AvatarFallback handles broken src automatically
  const avatarSrc =
    image && image.trim().length > 0 ? image : "/auth/default.png";

  return (
    <main className="h-full relative overflow-hidden rounded-3xl border border-border flex items-center justify-center">
      {/* Subtle ambient glows using theme primary */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full" />
      <div className="pointer-events-none absolute -right-24 -bottom-16 h-72 w-72 rounded-full" />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">

        {/* ── Main profile card ──────────────────────────── */}
        <Card className="border-border bg-card-foreground/30 shadow-md">
          <CardContent className="p-6 md:p-8">

            {/* Avatar + name */}
            <div className="mb-6 flex flex-wrap items-center gap-5">
              <div className="relative">
                <span className="absolute rounded-full" />
                <Avatar className="relative h-20 w-20 border-2 border-background">
                  <AvatarImage src={avatarSrc} alt={`Avatar de ${name}`} />
                  <AvatarFallback className="bg-muted text-foreground text-xl font-semibold">
                    {getInitials(name, email)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {name}
                </h1>
                <Badge
                  variant="secondary"
                  className="w-fit gap-1.5 rounded-full px-3 py-0.5 text-xs"
                >
                  <BadgeCheck className="size-3 text-primary" />
                  Perfil activo
                </Badge>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Info tiles */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <Mail className="size-3.5" />
                  Email
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {email}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Se unió
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {joinedDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Sidebar ────────────────────────────────────── */}
        <aside className="flex flex-col gap-6">

          {/* Preferences */}
          <Card className="border-border bg-card-foreground/60 text-card-foreground shadow-md">
            <CardHeader className="px-6 pb-3 pt-5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                <Sparkles className="size-3.5" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {preferences.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.map((pref) => (
                    <Badge
                      key={pref}
                      variant="outline"
                      className="cursor-default rounded-full px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    >
                      {pref}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic">
                  Aún no has configurado preferencias.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="border-border bg-card-foreground/60 text-card-foreground shadow-md">
            <CardHeader className="px-6 pb-3 pt-5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                <User className="size-3.5" />
                Actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6 pb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    Preferencias guardadas
                  </span>
                  <span className="text-xs font-semibold">
                    {preferences.length}
                  </span>
                </div>
                <Progress
                  value={Math.min(preferences.length * 10, 100)}
                  className="h-1.5"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    Estado de perfil
                  </span>
                  <span className="text-xs font-semibold">
                    Activo
                  </span>
                </div>
                <Progress value={82} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

        </aside>
      </div>
    </main>
  );
}