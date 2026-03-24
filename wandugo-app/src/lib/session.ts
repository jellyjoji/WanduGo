import { v4 as uuidv4 } from "uuid";

const SESSION_KEY = "wandugo_session_id";
const NAME_KEY = "wandugo_user_name";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem(NAME_KEY) || "Anonymous";
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name);
}
