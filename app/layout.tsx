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
    <html lang="es" className="dark">
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
                "!rounded-xl !border !shadow-lg !font-medium !text-white",
              error: "!bg-red-600 !border-red-700",
              success: "!bg-green-600 !border-green-700",
              warning: "!bg-yellow-600 !border-yellow-700",
              info: "!bg-blue-600 !border-blue-700",
              loading: "!bg-gray-800 !border-gray-600 !text-gray-100",
              closeButton:
                "!bg-transparent !text-gray-300 hover:!text-white"
            }
          }}
        />
      </body>
    </html>
  );
}
