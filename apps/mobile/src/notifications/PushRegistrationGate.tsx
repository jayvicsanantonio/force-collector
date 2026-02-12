import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { registerPushTokenIfNeeded } from "./push";

export function PushRegistrationGate() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void registerPushTokenIfNeeded(user.id);
  }, [user?.id]);

  return null;
}
