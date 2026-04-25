import "./globals.css"
import SupportChatLauncher from "@/components/support/SupportChatLauncher"

export const metadata = {
  title: "Termimal",
  description: "Termimal platform",
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
