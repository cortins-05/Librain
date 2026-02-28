"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Lock, Mail, Sparkles, UserRound } from "lucide-react";

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

type Props = React.ComponentProps<"div">;

export function SignupForm({ className, ...props }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordMismatch = useMemo(
    () => password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword,
    [password, confirmPassword]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (passwordMismatch) {
      setErrorMsg("Las contrasenas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await authClient.signUp.email(
        {
          email,
          password,
          name,
          callbackURL: "/",
        },
        {
          onSuccess: () => {
            router.push("/");
          },
          onError: (ctx) => {
            setErrorMsg(ctx.error.message);
          },
        }
      );

      if (error) setErrorMsg(error.message ?? "No se pudo crear la cuenta.");
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signUpWithGithub() {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await authClient.signIn.social(
        {
          provider: "github",
          callbackURL: "/",
        },
        {
          onError: (ctx) => setErrorMsg(ctx.error.message),
        }
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo registrar con GitHub.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signUpWithGoogle() {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await authClient.signIn.social(
        {
          provider: "google",
          callbackURL: "/",
        },
        {
          onError: (ctx) => setErrorMsg(ctx.error.message),
        }
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo registrar con Google.");
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
                  Register
                </Badge>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    Crea tu cuenta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Empieza a organizar y priorizar tareas con Librain en minutos.
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="register-name" className="text-sm font-medium">
                  <UserRound className="size-3.5" />
                  Name
                </FieldLabel>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Tu nombre"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="register-email" className="text-sm font-medium">
                  <Mail className="size-3.5" />
                  Email
                </FieldLabel>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="register-password" className="text-sm font-medium">
                    <Lock className="size-3.5" />
                    Password
                  </FieldLabel>
                  <Input
                    id="register-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-confirm-password" className="text-sm font-medium">
                    <Lock className="size-3.5" />
                    Confirm
                  </FieldLabel>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </Field>
              </div>

              <FieldDescription>
                Minimo 8 caracteres.
                {passwordMismatch ? (
                  <span className="ml-2 text-destructive">Las contrasenas no coinciden.</span>
                ) : null}
              </FieldDescription>

              {errorMsg ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMsg}
                </div>
              ) : null}

              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card/85">
                Or continue with
              </FieldSeparator>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={signUpWithGoogle}
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
                  onClick={signUpWithGithub}
                  disabled={isSubmitting}
                  className="justify-center gap-2"
                >
                  <Github className="size-4" />
                  GitHub
                </Button>
              </div>

              <FieldDescription className="text-center text-sm">
                Ya tienes cuenta? <Link href="/login">Inicia sesion</Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden border-l border-border/70 bg-muted/30 md:block">
            <Image
              fill
              src="/imagen_corporativa.png"
              alt="Librain"
              className="absolute inset-0 h-full w-full object-cover opacity-95 dark:brightness-[0.75] rounded-2xl"
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <Card className="border-border/70 bg-background/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" />
                    Primeros pasos
                  </CardTitle>
                  <CardDescription>
                    Registra tu cuenta y empieza a convertir notas sueltas en tareas accionables.
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
