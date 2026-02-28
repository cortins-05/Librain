"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Mail, Sparkles } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.signIn.email(
        {
          email,
          password,
          callbackURL: "/",
          rememberMe: true,
        },
        {
          onSuccess: () => router.push("/"),
          onError: (ctx) => setErrorMsg(ctx.error.message),
        }
      );

      if (error) setErrorMsg(error.message ?? "No se pudo iniciar sesion.");
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGithub() {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await authClient.signIn.social(
        { provider: "github", callbackURL: "/" },
        { onError: (ctx) => setErrorMsg(ctx.error.message) }
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo iniciar con GitHub.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await authClient.signIn.social(
        { provider: "google", callbackURL: "/" },
        { onError: (ctx) => setErrorMsg(ctx.error.message) }
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo iniciar con Google.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("animate-in fade-in-0 slide-in-from-bottom-4 duration-500", className)} {...props}>
      <Card className="overflow-hidden border-border/80 bg-card/85 shadow-sm backdrop-blur">
        <CardContent className="grid p-0 md:grid-cols-[1.2fr_0.8fr]">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              <div className="space-y-3 text-left">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs tracking-wide">
                  Inicio de sesión
                </Badge>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    Bienvenido de vuelta
                  </h1>
                  <p className="text-sm text-muted-foreground font-fira-sans">
                    Inicia sesión para continuar con tu panel de inquietudes inteligentes.
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="login-email" className="text-sm font-medium">
                  <Mail className="size-3.5" />
                  Email
                </FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field>
                <Input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>

              {errorMsg ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMsg}
                </div>
              ) : null}

              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card/85">
                O continúa con
              </FieldSeparator>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={signInWithGoogle}
                  disabled={isSubmitting}
                  className="justify-center gap-2"
                >
                  <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={signInWithGithub}
                  disabled={isSubmitting}
                  className="justify-center gap-2"
                >
                  <Github className="size-4" />
                  GitHub
                </Button>
              </div>

              <FieldDescription className="text-center text-sm">
                ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden border-l border-border/70 bg-muted/30 md:block">
            <Image
              src={"/imagen_corporativa.png"}
              alt="Librain"
              className="absolute inset-0 h-full w-full object-cover opacity-95 dark:brightness-[0.75] rounded-2xl"
              fill
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <Card className="bg-background/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" />
                    Librain
                  </CardTitle>
                  <CardDescription>
                    Organiza, analiza y prioriza tus inquietudes con ayuda de IA.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
