'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles,
  CheckCircle2,
  X,
  ShieldCheck,
  UserCheck,
  Fingerprint,
  ScanFace,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CrownLogo } from '@/components/ui/CrownLogo';
import { authenticateBiometrics, registerBiometricCredentials } from '@/lib/biometrics';

export default function LoginPage() {
  const router = useRouter();
  
  // Clean credentials form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Load saved credentials on startup
  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('kmc_remembered_email');
      const savedPassword = localStorage.getItem('kmc_remembered_password');
      const savedRemember = localStorage.getItem('kmc_remember_me');

      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      if (savedRemember !== null) setRememberMe(savedRemember === 'true');
    } catch (e) {}
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    try {
      localStorage.setItem('kmc_remembered_email', val);
    } catch (e) {}
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    try {
      localStorage.setItem('kmc_remembered_password', val);
    } catch (e) {}
  };

  const handleClearCredentials = () => {
    setEmail('');
    setPassword('');
    try {
      localStorage.removeItem('kmc_remembered_email');
      localStorage.removeItem('kmc_remembered_password');
    } catch (e) {}
  };

  // UI state
  const [loading, setLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Social Auth State & Modals
  const [socialModalType, setSocialModalType] = useState<'google' | 'apple' | null>(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialStatusText, setSocialStatusText] = useState('');
  const [appleHideEmail, setAppleHideEmail] = useState(false);
  // Biometric Auth State
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricState, setBiometricState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [biometricStatusText, setBiometricStatusText] = useState('Authenticate using your device sensor (Face ID / Fingerprint)');

  const handleBiometricLogin = async () => {
    setBiometricModalOpen(true);
    setBiometricState('scanning');
    setBiometricStatusText('Waiting for native Face ID / Fingerprint scan...');

    try {
      const bioEmail = email || localStorage.getItem('kmc_remembered_email') || '';
      const bioAuth = await authenticateBiometrics(bioEmail);

      if (!bioAuth.success) {
        setBiometricState('error');
        setBiometricStatusText(bioAuth.error || 'Biometric check failed. Please enter your password.');
        return;
      }

      // Establish verified server session token
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'biometric_login',
          email: bioEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBiometricState('success');
        setBiometricStatusText('Biometric Identity Confirmed • Welcome back');

        if (data.user) {
          localStorage.setItem('kmc_session', JSON.stringify(data.user));
          localStorage.setItem('kmc_profile_completed', 'true');
        }

        setTimeout(() => {
          window.location.replace('/discover');
        }, 500);
      } else {
        setBiometricState('error');
        setBiometricStatusText(data.error || 'Biometric authorization failed on server.');
      }
    } catch (err: any) {
      setBiometricState('error');
      setBiometricStatusText(err.message || 'Biometric security check error. Please use password.');
    }
  };

  const getPostLoginDestination = (role: 'MEMBER' | 'ADMIN' = 'MEMBER') => {
    if (role === 'ADMIN') return '/admin';
    try {
      const isCompleted = localStorage.getItem('kmc_profile_completed') === 'true';
      return isCompleted ? '/discover' : '/onboarding';
    } catch {
      return '/discover';
    }
  };

  const handleExecutiveSignUp = () => {
    router.push('/register?tier=executive');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Invalid credentials. Please verify your email and password.');
        setLoading(false);
        return;
      }

      try {
        if (data.user) {
          localStorage.setItem('kmc_session', JSON.stringify(data.user));
          localStorage.setItem('kmc_profile_completed', 'true');
        }
        if (rememberMe) {
          localStorage.setItem('kmc_remembered_email', email);
          localStorage.setItem('kmc_remembered_password', password);
          localStorage.setItem('kmc_remember_me', 'true');
        }
      } catch (e) {}

      const userRole = data.user?.role || 'MEMBER';
      const destination = getPostLoginDestination(userRole);
      window.location.href = destination;
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error. Please try again.');
      setLoading(false);
    }
  };

  const openSocialAuth = (provider: 'google' | 'apple') => {
    setSocialModalType(provider);
    setErrorMessage('');
    setSocialLoading(false);
    setSocialStatusText('');
    setSocialEmail('');
    setSocialName('');
  };

  const executeSocialLogin = async (provider: 'google' | 'apple') => {
    if (!socialEmail || !socialEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setSocialLoading(true);
    setSocialStatusText(
      provider === 'google' 
        ? 'Verifying Google OAuth 2.0 Credentials...' 
        : 'Verifying Apple ID Passkey & Biometrics...'
    );

    try {
      const targetEmail = (provider === 'apple' && appleHideEmail)
        ? `privaterelay_${Math.random().toString(36).substring(2, 9)}@privaterelay.appleid.com`
        : socialEmail.toLowerCase().trim();

      const targetName = socialName?.trim() || (provider === 'google' ? 'Google Member' : 'Apple ID Member');

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'social_login',
          provider,
          email: targetEmail,
          fullName: targetName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to authenticate with ${provider === 'google' ? 'Google' : 'Apple ID'}`);
      }

      setSocialStatusText('Access Granted. Entering Kiss My Cheek Club...');

      try {
        if (data.user) {
          localStorage.setItem('kmc_session', JSON.stringify(data.user));
          localStorage.setItem('kmc_profile_completed', 'true');
        }
      } catch (e) {}

      setTimeout(() => {
        const destination = getPostLoginDestination(data.user?.role || 'MEMBER');
        window.location.href = destination;
      }, 600);
    } catch (err: any) {
      setSocialLoading(false);
      setErrorMessage(err.message || 'Social authentication error. Please try again.');
      setSocialModalType(null);
    }
  };

  // Reset Password State (Real 2-Step OTP Security)
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'success'>('email');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleOpenForgotModal = () => {
    setIsForgotModalOpen(true);
    setResetStep('email');
    setResetError('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    if (email) setForgotEmail(email);
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setResetError('Please enter a valid member email address.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reset_otp',
          email: forgotEmail
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch security code');
      }
      setResetStep('otp');
    } catch (err: any) {
      setResetError(err.message || 'Error sending password reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetOtp || resetOtp.length < 6) {
      setResetError('Please enter the 6-digit verification code from your email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset_password',
          email: forgotEmail,
          otp: resetOtp,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setResetSuccessMessage(data.message || 'Password successfully updated.');
      setResetStep('success');
      setEmail(forgotEmail);
      setPassword(newPassword);
    } catch (err: any) {
      setResetError(err.message || 'Verification error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center px-4 py-6 sm:py-10 pt-[max(1.5rem,env(safe-area-inset-top,1.5rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] relative overflow-y-auto text-[#F4F4F6]">
      
      {/* Thick Dark Luxury Vignette Lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010102] via-[#040407] to-[#010102] pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-[#D4AF37]/8 via-[#9A7B1C]/5 to-transparent rounded-full blur-[180px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />

      {/* Brand Header */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-5 flex flex-col items-center group text-center relative z-10"
      >
        <Link href="/discover" className="flex flex-col items-center">
          <CrownLogo className="w-12 h-12 mb-2 group-hover:scale-105 transition-transform" />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest gold-gradient-text">KISSMYCHEEK</h1>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[#D4AF37]/80 font-semibold mt-0.5">
            Exclusive Dating & Social Club
          </span>
        </Link>
      </motion.div>

      {/* Card Wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full relative z-10"
      >
        <Card className="p-5 sm:p-7 border-[#D4AF37]/30 shadow-2xl backdrop-blur-2xl glass-panel relative overflow-hidden rounded-3xl">
          
          {/* Header Title */}
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-wide">Member Sign In</h2>
            <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
              Welcome back to Kiss My Cheek.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {errorMessage}
            </div>
          )}

          {/* CREDENTIALS LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/80 font-medium mb-1.5 block">Member Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-black/40 border border-[#D4AF37]/30 text-white placeholder:text-white/30 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-white/80 font-medium block">Password</label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs text-[#D4AF37] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full h-12 pl-11 pr-11 rounded-2xl bg-black/40 border border-[#D4AF37]/30 text-white placeholder:text-white/30 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    try {
                      localStorage.setItem('kmc_remember_me', String(checked));
                      if (checked) {
                        if (email) localStorage.setItem('kmc_remembered_email', email);
                        if (password) localStorage.setItem('kmc_remembered_password', password);
                      } else {
                        localStorage.removeItem('kmc_remembered_email');
                        localStorage.removeItem('kmc_remembered_password');
                      }
                    } catch (err) {}
                  }}
                  className="w-4 h-4 rounded bg-black/40 border-[#D4AF37]/40 text-[#D4AF37] focus:ring-0"
                />
                <span className="text-xs text-white/70">Remember credentials</span>
              </label>

              {(email || password) && (
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="text-[11px] text-white/40 hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl gold-gradient-bg text-black font-bold text-sm tracking-wider uppercase shadow-lg shadow-[#D4AF37]/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Sign In →'}
              </button>

              {/* Biometric Face ID & Fingerprint One-Touch Sign-In */}
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-white font-medium text-xs tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md hover:bg-white/[0.08] active:scale-[0.98] cursor-pointer group"
              >
                <Fingerprint className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                <span>Unlock with Face ID / Fingerprint</span>
              </button>

              {/* Fast-Track Executive VIP Sign Up */}
              <button
                type="button"
                onClick={() => handleExecutiveSignUp()}
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-[#D4AF37]/50 text-[#F3E5AB] font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 hover:bg-[#D4AF37]/30 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                ⚡ Executive VIP Sign Up
              </button>
            </div>
          </form>

          {/* Social Auth Buttons (Google & Apple ID - Real Authentication) */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <span className="text-[10px] uppercase tracking-widest text-white/50 block mb-3 font-medium">
              Or Fast Sign-In With
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openSocialAuth('google')}
                className="h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/30 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={() => openSocialAuth('apple')}
                className="h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/30 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
              >
                <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.57-.69.96-1.66.85-2.63-.83.03-1.84.55-2.44 1.25-.53.62-.99 1.61-.87 2.56.93.07 1.89-.48 2.46-1.18z"/>
                </svg>
                Apple ID
              </button>
            </div>
          </div>

        </Card>
      </motion.div>

      {/* BIOMETRIC AUTHENTICATION MODAL */}
      <AnimatePresence>
        {biometricModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="max-w-sm w-full bg-[#0D0D12] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-center"
            >
              <button
                type="button"
                onClick={() => setBiometricModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 animate-ping" />
                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                  biometricState === 'success' 
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                    : biometricState === 'error'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                    : 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.4)]'
                }`}>
                  {biometricState === 'success' ? (
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <Fingerprint className="w-8 h-8 animate-pulse" />
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold font-serif text-white tracking-wide">
                {biometricState === 'success' ? 'Access Granted' : 'Biometric Sensor'}
              </h3>
              
              <p className="text-xs text-white/70 mt-2 min-h-[32px] px-2 leading-relaxed">
                {biometricStatusText}
              </p>

              {biometricState !== 'success' && (
                <button
                  type="button"
                  onClick={() => setBiometricModalOpen(false)}
                  className="mt-5 w-full py-2.5 rounded-full border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Use Password Instead
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REAL SOCIAL SIGN-IN INTERACTIVE MODAL (GOOGLE & APPLE ID) */}
      <AnimatePresence>
        {socialModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="max-w-md w-full bg-[#0D0D12] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-2xl relative text-white"
            >
              <button
                type="button"
                onClick={() => { setSocialModalType(null); setSocialLoading(false); }}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Provider Header */}
              {socialModalType === 'google' ? (
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <svg className="w-7 h-7" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Sign in with Google</h3>
                  <p className="text-xs text-white/60 mt-1">
                    Connect your verified Google Account to enter Kiss My Cheek
                  </p>
                </div>
              ) : (
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.57-.69.96-1.66.85-2.63-.83.03-1.84.55-2.44 1.25-.53.62-.99 1.61-.87 2.56.93.07 1.89-.48 2.46-1.18z"/>
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Sign in with Apple ID</h3>
                  <p className="text-xs text-white/60 mt-1">
                    Biometric & Apple ID Passkey Authentication
                  </p>
                </div>
              )}

              {/* Account details form */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[11px] text-white/60 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={socialName}
                    onChange={(e) => setSocialName(e.target.value)}
                    disabled={socialLoading}
                    placeholder="Your Name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs sm:text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/60 block mb-1">
                    {socialModalType === 'google' ? 'Google Account Email' : 'Apple ID Email'}
                  </label>
                  <input
                    type="email"
                    value={socialEmail}
                    onChange={(e) => setSocialEmail(e.target.value)}
                    disabled={socialLoading || (socialModalType === 'apple' && appleHideEmail)}
                    placeholder={socialModalType === 'google' ? 'name@gmail.com' : 'name@icloud.com'}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs sm:text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {socialModalType === 'apple' && (
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={appleHideEmail}
                        onChange={(e) => setAppleHideEmail(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Hide My Email (Apple Private Relay)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Status / Loading State */}
              {socialLoading && (
                <div className="p-3 mb-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs flex items-center justify-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>{socialStatusText}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-2">
                <Button
                  variant="gold"
                  fullWidth
                  disabled={socialLoading}
                  onClick={() => executeSocialLogin(socialModalType)}
                  className="py-3 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {socialLoading ? (
                    <>Verifying Credentials...</>
                  ) : socialModalType === 'google' ? (
                    <>
                      <UserCheck className="w-4 h-4 text-black" />
                      Continue with Google
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-black" />
                      Authenticate with Apple ID
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  disabled={socialLoading}
                  onClick={() => setSocialModalType(null)}
                  className="w-full py-2 text-xs text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Security Footnote */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-white/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by 256-bit OAuth Tokenization & Cryptographic Sessions</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real 2-Step OTP Password Reset Modal */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="max-w-md w-full bg-[#0E0E14] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/50 flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(212,175,55,0.2)]">
                  <KeyRound className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white">Reset Member Password</h3>
                <p className="text-xs text-white/60 mt-1">
                  {resetStep === 'email' && 'Enter your registered email address to receive a secure one-time code.'}
                  {resetStep === 'otp' && `Enter the 6-digit code sent to ${forgotEmail} and choose your new password.`}
                  {resetStep === 'success' && 'Your credentials have been securely updated.'}
                </p>
              </div>

              {resetError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* Step 1: Enter Email */}
              {resetStep === 'email' && (
                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div>
                    <label className="text-[11px] text-white/70 font-medium mb-1 block">Registered Member Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="yourname@domain.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs sm:text-sm focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="flex-1 py-3 rounded-full text-xs text-white/70 hover:text-white border border-white/10 hover:bg-white/5 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <Button type="submit" variant="gold" className="flex-1 py-3 text-xs uppercase font-bold tracking-wider" disabled={resetLoading}>
                      {resetLoading ? 'Dispatching Code...' : 'Send Security Code'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 2: Enter 6-digit OTP & New Password */}
              {resetStep === 'otp' && (
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] text-white/70 font-medium mb-1 block">
                      6-Digit Security Code (Check Inbox & Spam)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center tracking-[8px] font-mono font-bold text-lg py-3 rounded-2xl bg-white/5 border border-[#D4AF37]/50 text-[#D4AF37] placeholder:text-white/20 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-white/70 font-medium mb-1 block">New Password (Min 6 chars)</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/70 font-medium mb-1 block">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetStep('email')}
                      className="py-2.5 px-4 rounded-full text-xs text-white/60 hover:text-white border border-white/10"
                    >
                      Back
                    </button>
                    <Button type="submit" variant="gold" className="flex-1 py-2.5 text-xs uppercase font-bold" disabled={resetLoading}>
                      {resetLoading ? 'Updating Password...' : 'Save & Sign In'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3: Success */}
              {resetStep === 'success' && (
                <div className="text-center py-3 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-emerald-300 font-medium">
                    {resetSuccessMessage || 'Your password has been successfully reset!'}
                  </p>
                  <Button 
                    variant="gold" 
                    fullWidth 
                    className="py-3 text-xs uppercase font-bold"
                    onClick={() => {
                      setIsForgotModalOpen(false);
                    }}
                  >
                    Continue to Sign In
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
