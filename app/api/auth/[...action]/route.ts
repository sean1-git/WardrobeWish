import { env } from "cloudflare:workers";
import { auth, type AuthEnv } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => auth(request, env as AuthEnv);
export const POST = GET;
