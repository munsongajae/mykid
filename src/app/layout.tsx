import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Twin Smart Planner | 쌍둥이 스마트 플래너",
  description: "지음이와 이음이의 급식, 학사일정, 학원 스케줄을 한눈에! NEIS API 연동 스마트 플래너",
  manifest: "/manifest.json",
  openGraph: {
    title: "Twin Smart Planner",
    description: "쌍둥이 스케줄 통합 관리 플래너",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0e17",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}


