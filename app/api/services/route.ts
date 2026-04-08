import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const services = db.prepare("SELECT * FROM services ORDER BY name").all();
    return NextResponse.json({ services });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al cargar servicios" },
      { status: 500 }
    );
  }
}
