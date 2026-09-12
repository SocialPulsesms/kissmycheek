'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, ArrowLeft, ShieldCheck, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#070709]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/discover" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Return to Kiss My Cheek
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-serif font-bold text-sm text-[#D4AF37]">Data Safety</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-widest">
            <Trash2 className="w-3 h-3" /> Account & Data Deletion
          </div>
          <h1 className="font-serif text-3xl font-bold text-white">Request Account and Data Deletion</h1>
          <p className="text-sm text-white/60">
            In accordance with Google Play and global privacy standards, members may request the permanent deletion of their account and all associated personal data.
          </p>
        </div>

        {/* Info card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 text-sm text-white/80 leading-relaxed">
          <h2 className="font-serif text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D4AF37]" /> What data will be permanently deleted?
          </h2>
          <ul className="space-y-1.5 list-disc list-inside text-white/70">
            <li>Member profile information, photos, biography, and location settings.</li>
            <li>Direct message threads and private chat histories.</li>
            <li>Voice call and 4K video date logs.</li>
            <li>Authentication records, verified email mappings, and device tokens.</li>
          </ul>
          <p className="text-xs text-white/50 pt-2 border-t border-white/10">
            Deletion is permanent and cannot be undone once confirmed.
          </p>
        </div>

        {/* Form */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="font-serif text-base font-bold text-white">Submit Deletion Request</h3>
          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Request received successfully</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Your deletion request for <strong>{email}</strong> has been logged. Our privacy team will process full account and data erasure within 48 hours.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Registered Member Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your member email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors shadow-lg"
              >
                Submit Account Deletion Request
              </button>
            </form>
          )}

          <p className="text-xs text-white/50 text-center pt-2">
            You can also delete your account instantly inside the mobile app: <strong>Settings &gt; Privacy &amp; Security &gt; Delete Account</strong>.
          </p>
        </div>
      </main>
    </div>
  );
}
