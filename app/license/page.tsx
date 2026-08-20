import { getLicenseStatus } from "@/lib/license";
import LicenseBlock from "@/components/admin/LicenseBlock";

export const dynamic = "force-dynamic";

export default function LicensePage() {
  const status = getLicenseStatus();
  return <LicenseBlock status={status} />;
}