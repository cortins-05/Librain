import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import ProfileClient from "./Profile-Client";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const user = session?.user;
  const userMeta = user as
    | (typeof user & { preferences?: string[]; createdAt?: string | Date })
    | undefined;

  const name = user?.name ?? "Anonymous User";
  const email = user?.email ?? "No email available";
  const image = user?.image ?? "/auth/defaultProfile.webp";
  const preferences = userMeta?.preferences ?? [];
  const joinedDate = userMeta?.createdAt
    ? new Date(userMeta.createdAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "No disponible";

  return (
    <main className="flex-1 h-full">
        <ProfileClient
          name={name}
          email={email}
          image={image}
          preferences={preferences}
          joinedDate={joinedDate}
        />
    </main>
  );
}