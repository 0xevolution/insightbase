import "./globals.css";

export const metadata = {
  title: "InsightBase — Bibliothèque d'Intelligence Business",
  description: "Digère tes articles, extrais les insights, génère du contenu.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
