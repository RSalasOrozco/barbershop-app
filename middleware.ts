import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose"; // Usaremos jose para verificar en Edge

// Esta función puede ser marcada como `async` si se usa `await` adentro
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Rutas públicas (no necesitan token)
  const publicPaths = ["/login", "/register", "/"];
  if (publicPaths.includes(pathname)) {
    // Si tiene token y está en página pública, redirigir al dashboard correspondiente
    if (token) {
      try {
        const secret = new TextEncoder().encode(
          "barbershop-secret-key-2024-change-in-production"
        );
        const { payload } = await jwtVerify(token, secret);

        if (payload.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        } else {
          return NextResponse.redirect(new URL("/cliente", request.url));
        }
      } catch (error) {
        // Token inválido, continuar normalmente
      }
    }
    return NextResponse.next();
  }

  // Rutas protegidas (necesitan token)
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(
      "barbershop-secret-key-2024-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);

    // Proteger rutas de admin
    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/cliente", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token inválido
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Configurar qué rutas ejecutan el middleware
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
