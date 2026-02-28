import { LoginForm } from "@/components/io/LoginForm";

export default function LoginPage() {
  return (
    <section className="relative isolate min-h-svh overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-5xl items-center">
        <LoginForm className="w-full" />
      </div>
    </section>
  );
}
