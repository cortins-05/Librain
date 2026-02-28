"use client"

import { Button } from "../ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {

    const router = useRouter();
    
    async function logout() {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => router.refresh(),
            },
        });
    }

  return (
    <Button variant={'destructive'} onClick={logout} className="cursor-pointer">
        Logout
    </Button>
  );
}