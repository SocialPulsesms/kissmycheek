import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Child Safety Standards & CSAE Prevention | Kiss My Cheek',
  description: 'Kiss My Cheek standards, policies, and mechanisms against child sexual abuse material (CSAM) and child sexual exploitation and abuse (CSAE). Strictly 18+.'
};

export default function ChildSafetyPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[#0d121f] border border-amber-500/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Child Safety Standards & CSAE Policy
            </h1>
            <p className="text-amber-400 font-medium text-sm mt-2">
              Kiss My Cheek — Zero-Tolerance Policy & Legal Compliance
            </p>
          </div>
          <Link
            href="/"
            className="self-start sm:self-auto text-xs px-4 py-2 rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="bg-red-950/30 border border-red-500/30 rounded-xl p-5">
            <h2 className="text-lg font-bold text-red-400 mb-2">1. Zero Tolerance Policy</h2>
            <p>
              Kiss My Cheek maintains an absolute, non-negotiable <strong>zero-tolerance policy</strong> against 
              Child Sexual Abuse Material (CSAM) and Child Sexual Exploitation and Abuse (CSAE). We strictly prohibit 
              the creation, possession, transmission, solicitation, promotion, or facilitation of any content or behavior 
              harming minors in any form.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Strict Age Requirement (18+ Adults Only)</h2>
            <p>
              Kiss My Cheek is strictly an adult matchmaking and networking platform reserved exclusively for individuals aged <strong>18 years and older</strong>. 
              Minors are prohibited from registering, accessing, or using any part of the service. Any account found to belong to or represent a minor will be immediately and permanently terminated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Proactive Detection and Moderation</h2>
            <p>
              To protect our community and enforce compliance with global child safety standards:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>All uploaded profile photos and visual media undergo automated visual safety screening to prevent the distribution of illicit or prohibited material.</li>
              <li>Text communications and member profiles are monitored using automated keyword filters and anomaly detection systems designed to intercept exploitative behavior.</li>
              <li>Trained safety moderators review flagged content and escalated reports 24/7 with immediate enforcement actions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. In-App Reporting Mechanism</h2>
            <p>
              Kiss My Cheek empowers users with clear, direct in-app reporting tools:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Every user profile, chat dispatch, and live date interface contains a prominent <strong>Report / Block</strong> button.</li>
              <li>Users can select safety-related violation categories, including child safety and underage user concerns.</li>
              <li>Safety reports trigger immediate isolation of the reported account pending mandatory investigation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Mandatory Law Enforcement & NCMEC Reporting</h2>
            <p>
              In accordance with international child protection laws, including 18 U.S.C. § 2258A and regional statutory obligations:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Kiss My Cheek promptly reports any confirmed or suspected instances of CSAM/CSAE to the <strong>National Center for Missing & Exploited Children (NCMEC)</strong> and relevant international and regional law enforcement authorities.</li>
              <li>We preserve necessary digital forensic logs, metadata, and communication records to support law enforcement investigations and prosecutions.</li>
            </ul>
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-amber-400 mb-2">6. Designated Point of Contact</h2>
            <p className="text-slate-300 mb-3">
              For urgent safety inquiries, law enforcement requests, or child safety compliance inquiries, please contact our designated safety team:
            </p>
            <div className="space-y-1 text-slate-200">
              <p><strong>Entity:</strong> Kiss My Cheek Compliance & Safety</p>
              <p><strong>Developer Contact:</strong> <a href="mailto:info@socialpulsesms.org" className="text-amber-400 underline">info@socialpulsesms.org</a></p>
              <p><strong>Safety Support:</strong> <a href="mailto:support@kissmycheek.org" className="text-amber-400 underline">support@kissmycheek.org</a></p>
            </div>
          </section>

          <p className="text-xs text-slate-500 pt-4 border-t border-slate-800">
            Last Updated: September 2026 • Kiss My Cheek Safety & Legal Affairs
          </p>
        </div>
      </div>
    </div>
  );
}
