import { NextResponse } from "next/server";
import { createAuthClient } from "~/lib/supabase-auth";

export async function POST() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thebrinsider.com"));
}
