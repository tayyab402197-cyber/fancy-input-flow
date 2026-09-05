import { useEffect, useState } from "react";
import { AUTH_EVENT, readAccount, type AuthAccount } from "@/lib/auth";

export type LocalUser = { id: string; email: string; created_at: string; name?: string; role?: string };

export function getLocalUser(): LocalUser | null {
  const acc = readAccount();
  if (!acc) return null;
  return {
    id: acc.id,
    email: acc.email,
    name: acc.name,
    role: acc.role,
    created_at: acc.createdAt,
  };
}

export function useSession() {
  const [user, setUser] = useState<LocalUser | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setUser(getLocalUser());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user, isSignedIn: !!user, isLoading: user === undefined };
}
