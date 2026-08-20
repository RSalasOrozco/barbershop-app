import { getLicenseStatus, isNearExpiry } from "@/lib/license";
import LicenseBlock from "@/components/admin/LicenseBlock";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const status = getLicenseStatus();

  if (!status.valid) {
    return <LicenseBlock status={status} />;
  }

  const nearExpiry = isNearExpiry(status);

  return (
    <>
      {nearExpiry && status.expiresAt && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-sm font-medium px-4 py-2 text-center">
          ⚠️ Licencia por vencer: {status.expiresAt} ({status.daysLeft} días). Contacta a tu proveedor para renovar.
        </div>
      )}
      {children}
    </>
  );
}