import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { AppFooter } from "@/components/AppFooter";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      <div className="flex-1 max-w-[720px] mx-auto px-6 py-12">
        <Link to="/dashboard" className="text-xs text-primary hover:underline mb-6 inline-block">← Back to Dashboard</Link>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Legal Notice & Copyright</h1>
        <p className="text-xs text-text-muted mb-10">Last updated: 2025</p>

        <div className="space-y-10">
          <section>
            <h2 className="text-base font-heading font-semibold text-primary mb-3">1. Ownership</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              PM Command Center AI and all associated designs, code architecture, workflows,
              and AI logic are the exclusive intellectual property of
              Herber Giovanni Fernando Perez Gonzalez, resident of Guatemala.
              All rights reserved under applicable national and international copyright law,
              including the Berne Convention for the Protection of Literary and Artistic Works.
            </p>
          </section>

          <section>
            <h2 className="text-base font-heading font-semibold text-primary mb-3">2. Restrictions</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              No part of this application — including but not limited to its source code,
              UI design, database architecture, AI prompt logic, automation workflows,
              and written content — may be reproduced, copied, modified, distributed,
              sublicensed, or commercially exploited without the express written consent
              of the copyright holder.
            </p>
          </section>

          <section>
            <h2 className="text-base font-heading font-semibold text-primary mb-3">3. Permitted Use</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              This software is made available solely for authorized users under direct
              agreement with the copyright holder. Access does not grant ownership,
              license to reproduce, or rights to derivative works.
            </p>
          </section>

          <section>
            <h2 className="text-base font-heading font-semibold text-primary mb-3">4. Contact</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              For licensing inquiries or legal correspondence, contact the copyright holder directly.
            </p>
          </section>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
