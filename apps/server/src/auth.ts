import { env } from "./env.js";
import { one, q } from "./db.js";

export interface Caller {
  userId: string;
  householdId: string;
  email: string;
  displayName: string | null;
}

/** Family allowlist: only these accounts may use Kort. Empty = anyone the login lets through (local dev). */
const allowedEmails = (process.env.KORT_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export function emailAllowed(email: string | undefined): boolean {
  if (allowedEmails.length === 0) return true;
  return !!email && allowedEmails.includes(email.toLowerCase());
}

/**
 * Identity comes from the gallab hub: Caddy enforces the Google login and sets Remote-Email
 * (client-sent Remote-* headers are stripped before that). With HUB_AUTH unset (development)
 * DEV_USER_EMAIL is used instead. A first-time email becomes a user in the family household.
 */
export async function resolveCaller(headers: { get(name: string): string | undefined | null }): Promise<Caller | null> {
  const raw = env.hubAuth ? headers.get("remote-email") : env.devUserEmail;
  const email = raw?.trim().toLowerCase();
  if (!email || !email.includes("@") || !emailAllowed(email)) return null;

  let user = await one<{ id: string; household_id: string | null; display_name: string | null }>(
    "select id, household_id, display_name from users where email = $1",
    [email],
  );
  if (!user) {
    user = await one(
      "insert into users (email, display_name) values ($1, $2) returning id, household_id, display_name",
      [email, email.split("@")[0]],
    );
  }
  if (!user) return null;
  if (!user.household_id) {
    // One family: join the existing household, or create the first one.
    const h = (await one<{ id: string }>("select id from households order by created_at limit 1")) ??
      (await one<{ id: string }>("insert into households default values returning id"));
    await q("update users set household_id = $1 where id = $2", [h!.id, user.id]);
    user.household_id = h!.id;
  }
  return { userId: user.id, householdId: user.household_id, email, displayName: user.display_name };
}
