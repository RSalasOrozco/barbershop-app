import { NextRequest, NextResponse } from "next/server";
import { isSecureRequest } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Eliminar la cookie del token
  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    secure: isSecureRequest(request),
    expires: new Date(0),
    path: "/"
  });

  return response;
}