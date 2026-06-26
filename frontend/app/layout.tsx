import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ResearchOS",
  description: "Multi-Agent AI Research System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0A0A0F" }}>
        {children}
      </body>
    </html>
  );
}