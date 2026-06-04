import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Cambiar a exportación por defecto
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/register", "/"];
  if (publicPaths.includes(pathname)) {
    if (token) {
      try {
        const secretKey =
          process.env.JWT_SECRET ||
          "barbershop-secret-key-2024-change-in-production";
        const secret = new TextEncoder().encode(secretKey);
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

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(
      "barbershop-secret-key-2024-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);

    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/cliente", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
