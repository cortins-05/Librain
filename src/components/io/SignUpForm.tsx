"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Better Auth: register / sign-up con email & password
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

      // por si acaso (algunos setups devuelven error aquí también)
      if (error) setErrorMsg(error.message!);
    } catch (err) {
      console.error(err)
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
      // Nota: en social normalmente redirige el navegador, no llega aquí
    } catch (err) {
      console.error(err)
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
      console.error(err)
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your email below to create your account
                </p>
              </div>
              
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  type="name"
                  placeholder="Nick"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your name with anyone else.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your email with anyone else.
                </FieldDescription>
              </Field>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </Field>
                </Field>

                <FieldDescription>
                  Must be at least 8 characters long.
                  {passwordMismatch ? (
                    <span className="ml-2 text-destructive">Passwords do not match.</span>
                  ) : null}
                </FieldDescription>
              </Field>

              {errorMsg ? (
                <Field>
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </Field>
              ) : null}

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <Field className="grid grid-cols-2 gap-4">
                {/* Google */}
                <Button type="button" onClick={signUpWithGoogle} disabled={isSubmitting}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Sign up with Google</span>
                </Button>

                {/* GitHub */}
                <Button type="button" onClick={signUpWithGithub} disabled={isSubmitting}>
                  <Github size={20} />
                  <span className="sr-only">Sign up with GitHub</span>
                </Button>
              </Field>

              {/* Facebook (si lo quieres visible, cámbialo a un botón real) */}
              {/* <Button type="button" onClick={signUpWithFacebook} disabled={isSubmitting}>
                Facebook
              </Button> */}

              <FieldDescription className="text-center">
                Already have an account? <Link href="/login">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="bg-muted relative hidden md:block">
            <Image
              fill
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}