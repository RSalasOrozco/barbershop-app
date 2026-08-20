import db from "@/lib/db";

export function generarCodigoConfirmacion(): string {
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `BAR-${numero}`;
}

export function generarCodigoUnico(): string {
  let codigo: string;
  let existe: boolean;

  do {
    codigo = generarCodigoConfirmacion();
    const verificar = db
      .prepare("SELECT id FROM appointments WHERE confirmation_code = ?")
      .get(codigo);
    existe = !!verificar;
  } while (existe);

  return codigo;
}

export function validatePhone(phone: string): { valid: boolean; error: string } {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

  const phoneRegex = /^\d+$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: "Solo se permiten números" };
  }

  if (cleanPhone.length !== 10) {
    return { valid: false, error: "El número debe tener 10 dígitos" };
  }

  if (!cleanPhone.startsWith("3")) {
    return {
      valid: false,
      error: "Debe ser un número de celular que empiece con 3"
    };
  }

  return { valid: true, error: "" };
}