import type { Metadata } from "next"
import "./globals.css"
import SupportChatLauncher from "@/components/support/SupportChatLauncher"

export const metadata: Metadata = {
  title: "Termimal",
  description: "Termimal platform",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SupportChatLauncher />
      </body>
    </html>
  )
}