import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Eliminar la cookie del token
  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    expires: new Date(0), // Fecha en el pasado = eliminar
    path: "/"
  });

  return response;
}
