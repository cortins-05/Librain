"use client";

import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LoginPreferencesAlertProps {
  shouldWarn: boolean;
}

export default function LoginPreferencesAlert({ shouldWarn }: LoginPreferencesAlertProps) {
  const router = useRouter();
  if (!shouldWarn) return null;

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>IMPORTANTE</AlertDialogTitle>
          <AlertDialogDescription>
            Para el correcto funcionamiento de esta web, es imprescindible que
            fijes como minimo 4 preferencias.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cerrar</AlertDialogCancel>
          <AlertDialogAction onClick={() => router.push("/profile")}>
            Ir a perfil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
