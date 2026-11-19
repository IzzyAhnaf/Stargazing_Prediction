import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

// Newsreader carries the numerals and headings (an almanac feel);
// Instrument Sans handles everything functional.
const ui = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Stargazing & Milky Way Forecast Predictor | AI Night Sky Clarity",
  description: "Machine Learning decision support system predicting astronomical seeing, Milky Way core visibility, and stargazing clarity via XGBoost & SHAP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable} dark antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const isBadAttr = (name) => 
                  name === 'bis_skin_checked' || 
                  name === 'bis_register' || 
                  name === 'fdprocessedid' || 
                  name.startsWith('__processed_');

                function clean(el) {
                  if (!el || !el.attributes) return;
                  const toRemove = [];
                  for (let i = 0; i < el.attributes.length; i++) {
                    const attr = el.attributes[i].name;
                    if (isBadAttr(attr)) toRemove.push(attr);
                  }
                  toRemove.forEach(a => el.removeAttribute(a));
                }

                function cleanAll(root) {
                  clean(root);
                  if (root.querySelectorAll) {
                    root.querySelectorAll('*').forEach(clean);
                  }
                }

                if (typeof document !== 'undefined') {
                  cleanAll(document.documentElement);
                  const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                      if (m.type === 'attributes' && isBadAttr(m.attributeName)) {
                        m.target.removeAttribute(m.attributeName);
                      } else if (m.type === 'childList') {
                        m.addedNodes.forEach(node => {
                          if (node.nodeType === 1) cleanAll(node);
                        });
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    childList: true,
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: "#0b0f1e",
          color: "#e9e6dc",
          fontFamily: "var(--font-ui), system-ui, sans-serif",
        }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
