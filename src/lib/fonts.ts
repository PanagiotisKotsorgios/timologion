import { Manrope } from "next/font/google";

// Single-family type system: Manrope handles both body and display via weight.
// Full Greek support. Loading all weights so we can push to 800 in headlines.
export const body = Manrope({
  subsets: ["latin", "latin-ext", "greek"],
  variable: "--font-body",
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

// Alias — same font, kept as a separate export so page code that references
// both display and body still compiles.
export const display = body;
