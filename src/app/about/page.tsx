import Link from "next/link";
import {
  ArrowRight,
  BrainCog,
  CheckCircle2,
  FileText,
  Gauge,
  ImageIcon,
  Link2,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const highlights = [
  {
    title: "Entrada flexible",
    description: "Añade inquietudes desde URL, texto o archivo. Soporta PDF e imágenes en el mismo flujo.",
    icon: Link2,
  },
  {
    title: "Análisis IA útil",
    description: "Cada inquietud recibe un resumen claro, un estado de madurez y una puntuación de 0 a 100.",
    icon: BrainCog,
  },
  {
    title: "Priorización real",
    description: "Tus preferencias personales se usan para ajustar la evaluación de cada inquietud.",
    icon: Gauge,
  },
  {
    title: "Control total",
    description:
      "Marca inquietudes como completadas, elimina lo que no aporta y mantén tu lista de pendientes limpia.",
    icon: CheckCircle2,
  },
];

const workflow = [
  {
    title: "Captura",
    description:
      "Sube un PDF o una imagen, pega texto o una URL, y añade una descripción breve del objetivo.",
    icon: FileText,
  },
  {
    title: "Comprensión",
    description:
      "Librain analiza el contenido y genera metadatos prácticos para decidir qué hacer primero.",
    icon: Sparkles,
  },
  {
    title: "Ejecución",
    description:
      "Visualiza la puntuación y el estado, completa recomendaciones y avanza con prioridades claras.",
    icon: ListChecks,
  },
];

export default function AboutPage() {
  return (
    <section className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-10">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border border-primary/30" />
            <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Convierte información suelta en recomendaciones accionables.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg font-fira-sans">
              Librain centraliza lo que guardas durante el día y lo transforma en decisiones claras:
              resumen IA, estado de madurez y prioridad para que sepas qué hacer primero.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/actions/addTask">
                  Crear inquietud <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/profile">Ver perfil y preferencias</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Link2 className="size-3.5" /> URL
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <FileText className="size-3.5" /> PDF y texto
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <ImageIcon className="size-3.5" /> Imágenes
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500"
                style={{ animationDelay: `${80 * index}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 grid-cols-1">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl">Cómo funciona en la práctica</CardTitle>
              <CardDescription>
                Flujo rápido para pasar de la idea a la acción sin perder contexto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflow.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {index + 1}. {item.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {index < workflow.length - 1 ? <Separator className="mt-4" /> : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Privado por cuenta</p>
                <p className="text-sm text-muted-foreground">
                  Tu espacio está protegido por inicio de sesión y sesión activa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <UserRoundCheck className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Personalizado para ti</p>
                <p className="text-sm text-muted-foreground">
                  Las preferencias de tu perfil mejoran la priorización de resultados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <Gauge className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Decisiones más rápidas</p>
                <p className="text-sm text-muted-foreground">
                  Menos ruido, más claridad para ejecutar con impacto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
