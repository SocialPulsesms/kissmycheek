'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#070709]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/discover" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Return to Club
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-serif font-bold text-sm tracking-wide text-[#D4AF37]">Kiss My Cheek</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-widest">
            <Lock className="w-3 h-3" /> Confidential & Encrypted
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-white/60">Effective Date: September 11, 2026 | Last Updated: September 11, 2026</p>
        </div>

        {/* Content sections */}
        <div className="space-y-8 text-sm leading-relaxed text-white/80">
          <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <Eye className="w-4 h-4" /> 1. Commitment to Member Confidentiality
            </h2>
            <p>
              Kiss My Cheek (&quot;we&quot;, &quot;our&quot;, or &quot;the Club&quot;) operates an exclusive, private matchmaking and social club. We are deeply committed to protecting the privacy, discretion, and confidential data of all verified members. This policy explains how we collect, handle, and safeguard your personal information when you use our mobile application and web platform at <strong className="text-white">kissmycheek.org</strong>.
            </p>
          </section>

          <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <FileText className="w-4 h-4" /> 2. Information We Collect
            </h2>
            <ul className="space-y-2 list-disc list-inside text-white/70">
              <li><strong className="text-white">Account Information:</strong> Full name, verified email address, date of birth, gender, and contact details.</li>
              <li><strong className="text-white">Profile Details:</strong> Photographs, professional background, location preferences, bio, and curated lifestyle interests.</li>
              <li><strong className="text-white">Real-Time Communications:</strong> Private dispatches, voice call connection logs, and 4K video date session signaling data. All audio and video streams utilize encrypted peer-to-peer WebRTC protocols and are never recorded without explicit consent.</li>
              <li><strong className="text-white">Device & Diagnostics:</strong> Device model, operating system version, crash diagnostics, and anonymous session telemetry to maintain performance.</li>
            </ul>
          </section>

          <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <Lock className="w-4 h-4" /> 3. How We Use Your Data
            </h2>
            <p>We process member information strictly for the following purposes:</p>
            <ul className="space-y-1.5 list-disc list-inside text-white/70">
              <li>To facilitate matchmaking matches and verified member discovery.</li>
              <li>To establish secure HD audio calls and 4K video date connections.</li>
              <li>To verify identity, prevent impersonation, and maintain club safety.</li>
              <li>To provide customer support and process member tier subscriptions.</li>
            </ul>
            <p className="text-xs text-white/50 pt-1">We do not sell, rent, or trade your personal data to third-party advertisers or data brokers under any circumstances.</p>
          </section>

          <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 4. Data Security & Retention
            </h2>
            <p>
              All data transmissions are protected using industry-standard TLS/SSL encryption. Member dispatches and media assets are stored in enterprise-grade secured cloud infrastructure with strict access controls. You may request account deletion and complete erasure of your personal data at any time via the Settings screen or by emailing our privacy team.
            </p>
          </section>

          <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <Shield className="w-4 h-4" /> 5. Contact & Data Protection Officer
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy or wish to exercise your data rights (access, rectification, or deletion), please contact our Data Privacy Office:
            </p>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-xs space-y-1 text-white/80">
              <p>Email: <span className="text-[#D4AF37]">privacy@kissmycheek.org</span></p>
              <p>Support: <span className="text-[#D4AF37]">support@kissmycheek.org</span></p>
              <p>Website: <span className="text-[#D4AF37]">https://kissmycheek.org</span></p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Kiss My Cheek. All rights reserved. Confidential & Proprietary.
        </footer>
      </main>
    </div>
  );
}
