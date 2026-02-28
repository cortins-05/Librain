"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash } from 'lucide-react';
import {
  BadgeCheck,
  CalendarDays,
  Mail,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addPreferenceAction, deletePreferenceAction } from "@/actions/profile/managePreferences";
import { useRouter } from "next/navigation";

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
  const avatarSrc = image && image.trim().length > 0 ? image : "/auth/default.png";
  const safeName = name.trim() || "Anonymous User";
  const router = useRouter();

  const [addition, setAddition] = useState(false);
  const [preferenceName, setPreferenceName] = useState<string|null>(null);

  const [showDeletePreference, setShowDeletePreference] = useState<string|null>(null);

  async function deletePreference(name:string){
    await deletePreferenceAction(name);
    router.refresh();
  }

  async function addPreference(){
    if(!preferenceName||preferenceName==""){
      toast("Error al introducir la preferencia, revisa el campo.")
      return;
    }
    await addPreferenceAction(preferenceName);
    router.refresh();
  }

  return (
    <section className="relative isolate h-full overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 overflow-hidden border-border/80 bg-linear-to-br from-background via-background to-muted/70 shadow-sm duration-500">
          <CardContent className="relative p-6 md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/25" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-xs tracking-wide">
              Profile
            </Badge>

            <div className="relative flex flex-wrap items-center gap-5">
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-1.5">
                <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                  <AvatarImage src={avatarSrc} alt={`Avatar de ${safeName}`} />
                  <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
                    {getInitials(safeName, email)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {safeName}
                </h1>
                <Badge
                  variant="secondary"
                  className="w-fit gap-1.5 rounded-full px-3 py-1 text-xs"
                >
                  <BadgeCheck className="size-3 text-primary" />
                  Perfil activo
                </Badge>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Mail className="size-3.5" />
                  Email
                </p>
                <p className="truncate text-sm font-semibold text-foreground">{email}</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  Se unio
                </p>
                <p className="truncate text-sm font-semibold text-foreground">{joinedDate}</p>
              </div>
            </div>

            <div className="mt-10 rounded-xl border border-border/70 bg-background/45 p-4 flex flex-col">
              <p className="flex gap-3"><Sparkles />Preferences <button className="ml-auto transition-all hover:rotate-45" onClick={()=>{setAddition(true)}}> <Plus/> </button></p>
              {
                addition
                &&
                <>
                  <Separator className="my-5" />
                  <span className="flex gap-3">
                    <Input type="text" placeholder="Preference Name..." onChange={(e)=>{setPreferenceName(e.target.value)}} />
                    {
                      preferenceName
                      &&
                      <Button variant={"outline"} onClick={addPreference}>
                        <Plus/>
                      </Button>
                    }
                  </span>
                </>
              }
              <Separator className="my-5" />
              <ul className="flex flex-col gap-3 list-disc ml-5">
                {
                  preferences.map((preference,index)=>(
                    <li key={index} className="flex justify-between" onMouseLeave={()=>setShowDeletePreference(null)} onMouseEnter={()=>{setShowDeletePreference(preference)}}>
                      {preference}
                      {
                        showDeletePreference
                        &&
                        <button onClick={()=>{deletePreference(preference)}}> <Trash /> </button>
                      }
                    </li>
                  ))
                }
              </ul>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500 [animation-delay:160ms]">
            <CardContent className="flex items-start gap-3 py-6">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <WandSparkles className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Personalizacion activa</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Cuantas mas preferencias tengas, mejor se ajusta el score de prioridades.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500 [animation-delay:220ms]">
            <CardContent className="flex items-start gap-3 py-6">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <UserRound className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Cuenta lista para trabajar</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tu perfil esta activo y preparado para guardar y priorizar nuevas tareas.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
