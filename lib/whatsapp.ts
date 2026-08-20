/**
 * Utilidades para notificación por WhatsApp mediante enlace wa.me.
 * No requiere API ni costo: abre WhatsApp con un mensaje pre-armado
 * para que el cliente responda con opciones rápidas.
 */

export function normalizeDigits(phone: string): string {
  return (phone || "").replace(/[\s\-\(\)]/g, "");
}

export function toWhatsAppNumber(phone: string): string | null {
  const digits = normalizeDigits(phone);
  if (!/^\d+$/.test(digits)) return null;

  // Colombia: prefijo internacional 57 + 10 dígitos
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("57")) {
    return digits;
  }
  return null;
}

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function formatMessage(msg: string): string {
  return encodeURIComponent(msg);
}

export function appointmentConfirmationMessage(opts: {
  clientName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  code: string;
}): string {
  return [
    `Hola ${opts.clientName} ✂️💈`,
    `Tu cita en la barbería quedó confirmada:`,
    ``,
    `📋 Servicio: ${opts.serviceName}`,
    `💈 Peluquero: ${opts.barberName}`,
    `📅 Fecha: ${opts.date}`,
    `⏰ Hora: ${opts.time}`,
    `🔑 Código: ${opts.code}`,
    ``,
    `Preséntalo cuando llegues. ¡Te esperamos!`
  ].join("\n");
}

export function absenceReassignmentMessage(opts: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  absentBarber: string;
  alternativeBarber: string;
  alternativeTime?: string;
}): string {
  const altTimeLine = opts.alternativeTime
    ? ` a las ${opts.alternativeTime}`
    : " en el mismo horario";
  return [
    `Hola ${opts.clientName} 🙏`,
    `Lamentamos informarte que tu peluquero ${opts.absentBarber} no podrá atenderte el día de hoy.`,
    ``,
    `Tu cita era:`,
    `📋 ${opts.serviceName} — 📅 ${opts.date} — ⏰ ${opts.time}`,
    ``,
    `Podemos reagendarla con ${opts.alternativeBarber}${altTimeLine}.`,
    ``,
    `📌 Por favor responde:`,
    `1️⃣ Acepto el cambio de peluquero`,
    `2️⃣ Prefiero otro día u horario`,
    `3️⃣ Cancelar`,
    ``,
    `¡Gracias por tu comprensión!`
  ].join("\n");
}

export function rescheduleOfferMessage(opts: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  barberName: string;
}): string {
  return [
    `Hola ${opts.clientName} 👋`,
    `Tienes una cita con ${opts.barberName}:`,
    `📋 ${opts.serviceName} — 📅 ${opts.date} — ⏰ ${opts.time}`,
    ``,
    `¿Deseas confirmarla, cambiarla de horario o cancelarla?`,
    ``,
    `1️⃣ Confirmar`,
    `2️⃣ Cambiar fecha/hora`,
    `3️⃣ Cancelar`
  ].join("\n");
}