import "./globals.css";

export const metadata = {
  title: "Midnight Signal",
  description: "Broadcasting from the digital ether...",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* The font is now applied globally via globals.css */}
      <body>{children}</body>
    </html>
  );
}