"use client";

import { useState } from "react";
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
  sessionId: string | null;
}

function getStorageKey(sessionId: string) {
  return `librain:home:preferences-alert:${sessionId}`;
}

export default function LoginPreferencesAlert({
  shouldWarn,
  sessionId,
}: LoginPreferencesAlertProps) {
  const router = useRouter();
  const [defaultOpen] = useState(() => {
    if (!shouldWarn || !sessionId || typeof window === "undefined") {
      return false;
    }

    const storageKey = getStorageKey(sessionId);
    const alreadyShown = window.sessionStorage.getItem(storageKey) === "1";
    if (alreadyShown) return false;

    window.sessionStorage.setItem(storageKey, "1");
    return true;
  });

  if (!shouldWarn) return null;

  return (
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>IMPORTANTE</AlertDialogTitle>
          <AlertDialogDescription>
            Para el correcto funcionamiento de esta web, es imprescindible que
            fijes como mínimo 4 preferencias.
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
