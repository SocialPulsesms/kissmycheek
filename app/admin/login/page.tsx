'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff, 
  Crown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Fingerprint
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CrownLogo } from '@/components/ui/CrownLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@kissmycheek.com');
  const [password, setPassword] = useState('Admin1234!');
  const [securityPin, setSecurityPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          securityPin
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Access Denied: Invalid Administrative Credentials.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Clearance Authenticated. Entering Executive Workspace...');
      try {
        if (data.adminUser) {
          localStorage.setItem('kmc_session', JSON.stringify(data.adminUser));
        }
      } catch {}

      setTimeout(() => {
        window.location.replace('/admin');
      }, 1000);

    } catch (err: any) {
      setErrorMessage('Network error during authentication. Please retry.');
      setLoading(false);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#030305] text-[#F4F4F6] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Deep Obsidian Security Atmosphere Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010103] via-[#06060A] to-[#010103] pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-[#D4AF37]/10 via-[#9A7B1C]/5 to-transparent rounded-full blur-[160px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center relative z-10">
        <div className="w-16 h-16 rounded-3xl gold-gradient-bg flex items-center justify-center text-black shadow-[0_0_35px_rgba(212,175,55,0.4)] mb-3">
          <Crown className="w-9 h-9 text-black" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest gold-gradient-text">
          KISSMYCHEEK
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
            Executive Governance Portal
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[11px] text-white/40 mt-0.5">
          Restricted Master Security Gateway • kissmycheek.org
        </span>
      </div>

      {/* Admin Login Card */}
      <div className="max-w-md w-full relative z-10">
        <Card className="p-6 sm:p-8 border-[#D4AF37]/40 shadow-2xl glass-panel relative rounded-3xl">
          
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Staff Clearance</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Root Level
            </span>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            
            {/* Admin Email */}
            <div>
              <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Administrative Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kissmycheek.com"
                className="w-full px-4 py-3 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none transition-colors"
              />
            </div>

            {/* Master Access Key / Password */}
            <div>
              <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Master Access Key</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Security PIN / Clearance Token */}
            <div>
              <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Hardware Security PIN (Optional)</span>
                </span>
                <span className="text-[10px] text-white/40">2FA Token</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                placeholder="6-digit clearance code"
                className="w-full px-4 py-3 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none transition-colors font-mono tracking-widest text-center"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl gold-gradient-bg text-black font-serif font-bold text-sm tracking-wider uppercase hover:scale-[1.02] transition-all shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Lock className="w-4 h-4 animate-spin" />
                  <span>Authenticating Clearance...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Executive Access</span>
                </>
              )}
            </button>

          </form>

          {/* Quick Preset Selector Buttons */}
          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-white/40 block text-center">Quick Admin Presets:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset('admin@kissmycheek.com', 'Admin1234!')}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 text-[10px] font-semibold text-white/80 hover:text-white transition-all text-left"
              >
                👑 Master Admin
                <span className="text-[9px] text-white/40 block">admin@kissmycheek.com</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('info@socialpulsesms.org', 'iF@1blinkin1212!`~')}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 text-[10px] font-semibold text-white/80 hover:text-white transition-all text-left"
              >
                💼 Business Admin
                <span className="text-[9px] text-white/40 block">info@socialpulsesms.org</span>
              </button>
            </div>
          </div>

        </Card>

        {/* Back to Member Platform */}
        <div className="mt-4 text-center">
          <Link href="/discover" className="text-xs text-white/50 hover:text-[#D4AF37] transition-colors flex items-center justify-center gap-1.5">
            <span>Return to Kiss My Cheek Member Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
}
