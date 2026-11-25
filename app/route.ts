import { secureResponse } from "@/lib/security";
import { landingHtml } from "@/lib/landing-html";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return secureResponse(new Response(landingHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } }), request);
}
