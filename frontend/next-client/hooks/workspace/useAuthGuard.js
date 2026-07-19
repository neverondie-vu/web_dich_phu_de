import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

export function useAuthGuard(router) {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (authChecked && !user) router.push("/auth/login");
  }, [authChecked, router, user]);

  async function handleLogout() {
    await auth.signOut();
    router.push("/");
  }

  return {
    authChecked,
    handleLogout,
    user,
  };
}
