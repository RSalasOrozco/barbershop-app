import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "BarberTrack",
  description: "Sistema de gestión de barbería"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast:
                "!rounded-xl !border !shadow-lg !font-medium",
              error: "!bg-red-50 !border-red-300 !text-red-800",
              success: "!bg-green-50 !border-green-300 !text-green-800",
              warning: "!bg-yellow-50 !border-yellow-300 !text-yellow-800",
              info: "!bg-blue-50 !border-blue-300 !text-blue-800",
              loading: "!bg-white !border-gray-200 !text-gray-800",
              closeButton:
                "!bg-transparent !text-gray-400 hover:!text-gray-600"
            }
          }}
        />
      </body>
    </html>
  );
}
