import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="border-t border-border py-4 px-6 text-center flex-shrink-0" style={{ backgroundColor: "hsl(240 7% 4%)" }}>
      <p className="text-[11px] leading-relaxed text-text-muted font-body">
        © 2025 Herber Giovanni Fernando Perez Gonzalez. All rights reserved.
        <br />
        PM Command Center AI is the original intellectual property of Herber Giovanni Fernando Perez Gonzalez.
        <br />
        Unauthorized reproduction, distribution, or commercial use of this software,
        its design, architecture, or any derivative work is strictly prohibited.
        <span className="mx-2">·</span>
        <Link to="/legal" className="underline hover:text-foreground transition-colors">Legal Notice</Link>
      </p>
    </footer>
  );
}
