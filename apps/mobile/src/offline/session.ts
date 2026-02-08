import { clearAuthToken } from "../api/auth";
import { clearUserDatabase, setActiveUserId } from "./db";

export async function signOutAndClearUserData() {
  await clearAuthToken();
  await clearUserDatabase();
  setActiveUserId(null);
}
