import { NextResponse } from "next/server";
import { registerUser, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, name, role } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const result = await registerUser({ email, password, name, role });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ user: result.user });
}
