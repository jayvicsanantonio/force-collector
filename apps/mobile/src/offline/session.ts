import { clearAuthToken } from "../api/auth";
import { queryClient } from "../api/queryClient";
import { supabase } from "../auth/supabase";
import { clearUserDatabase, setActiveUserId } from "./db";

export async function signOutAndClearUserData() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore network failures and continue clearing local data.
  }
  await clearAuthToken();
  await clearUserDatabase();
  setActiveUserId(null);
  queryClient.clear();
}
