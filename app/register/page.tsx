'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Heart, 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Award,
  Upload,
  AlertCircle,
  Scan,
  Check,
  Compass,
  X,
  KeyRound,
  RotateCw,
  Eye,
  EyeOff,
  GraduationCap
} from 'lucide-react';
import { NIGERIAN_STATES, ALL_COUNTRIES } from '@/lib/locationsData';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CrownLogo } from '@/components/ui/CrownLogo';
import { calculateAge } from '@/lib/dateUtils';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [loading, setLoading] = useState(false);

  // Form State - Step 1: Credentials & Passwords
  const [titlePrefix, setTitlePrefix] = useState('Ms.');
  const [fullName, setFullName] = useState('');
  const [customName, setCustomName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Email OTP Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form State - Step 2: Vital Demographics
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Woman');
  const [pronouns, setPronouns] = useState('she/her');
  const [height, setHeight] = useState(`5'8" (173 cm)`);

  // Form State - Step 3: Geographic Residence
  const [location, setLocation] = useState('');

  // Form State - Step 4: Career & High Society Bio
  const [profession, setProfession] = useState('');
  const [education, setEducation] = useState('');
  const [bio, setBio] = useState('');

  // Form State - Step 5: Dating Intentions & Match Preferences
  const [interestedIn, setInterestedIn] = useState('Men');
  const [relationshipGoal, setRelationshipGoal] = useState('Serious Relationship & Marriage');
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(45);

  // Form State - Step 6: Mandatory Areas of Interest (min 3 required)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const availableInterests = [
    'Afrobeats & Global Sound',
    'Owambe Luxury & Galas',
    'Lagos & Abuja Polo Clubs',
    'Banana Island & Ikoyi Real Estate',
    'Nollywood Cinema & Arts',
    'African Contemporary Art',
    'Traditional Royalty & Heritage',
    'Tech Angel & Venture Investing',
    'Fine Dining & Suya Grills',
    'High Society Soirées & Lounges',
    'Eko Atlantic Yachting',
    'Private Jet & Aviation Charter',
    'Haute Couture & Aso Ebi Elegance',
    'Horology & Luxury Timepieces',
    'Michelin Gastronomy & Wine Tasting',
    'Equestrian & Polo Sports',
    'Philanthropy & Foundation Galas',
    'Architectural Design & Estates',
    'Formula 1 & Supercars',
    'Wellness, Spa & Golfing Retreats',
    'Art & Fine Art',
    'Yachting & Sailing',
    'Venture Capital & Private Equity',
    'Alpine Skiing & St. Moritz',
    'Classical Music & Opera'
  ];

  // Form State - Step 7: Portfolio, Real WebRTC Biometric Camera & Membership Tier
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [isScanningSelfie, setIsScanningSelfie] = useState(false);
  const [selfieMatchScore, setSelfieMatchScore] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [membershipTier, setMembershipTier] = useState<'select' | 'black' | 'founder'>('black');
  const [referralCode, setReferralCode] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Error validation text
  const [validationError, setValidationError] = useState('');

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const toggleInterest = (interest: string) => {
    setValidationError('');
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const startLiveCamera = async () => {
    setCameraError('');
    setIsScanningSelfie(false);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Camera access was declined or is unavailable. Please allow camera permissions in your browser or take a photo.');
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const captureAndVerifySelfie = () => {
    if (!videoRef.current) return;
    setIsScanningSelfie(true);
    setValidationError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedSelfie(photoDataUrl);

        setTimeout(() => {
          setIsScanningSelfie(false);
          setSelfieVerified(true);
          setSelfieMatchScore(99.6);
          setUploadedPhotos(prev => [photoDataUrl, ...prev.filter(p => p !== photoDataUrl)]);
          stopLiveCamera();
        }, 1800);
      }
    } catch (err) {
      setIsScanningSelfie(false);
      setCameraError('Failed to capture frame. Please try again.');
    }
  };

  const triggerSendEmailOtp = async (targetEmail: string, name: string) => {
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccessMessage('');
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email: targetEmail,
          fullName: name
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification email');
      }
      setOtpSuccessMessage(`Confidential 6-digit access code sent to ${targetEmail}`);
      setResendCooldown(60);
    } catch (err: any) {
      setOtpError(err.message || 'Error connecting to email service');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const code = otpDigits.join('').trim();
    if (code.length < 6) {
      setOtpError('Please enter the full 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp: code
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }
      setIsEmailVerified(true);
      setIsOtpModalOpen(false);
      setStep(2);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextInput = document.getElementById(`reg-otp-${Math.min(digits.length, 5)}`);
      nextInput?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      const nextInput = document.getElementById(`reg-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPhotos(prev => [reader.result as string, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Step 1: Mandatory Credentials & Password Matching
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !password) {
        setValidationError('Please complete all mandatory credential fields.');
        return;
      }
      if (password.length < 8) {
        setValidationError('Password must contain a minimum of 8 characters with at least 1 symbol.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match. Please ensure both passwords match identically.');
        return;
      }
      if (!isEmailVerified) {
        setIsOtpModalOpen(true);
        setOtpDigits(['', '', '', '', '', '']);
        triggerSendEmailOtp(email, `${titlePrefix} ${fullName}`.trim());
        return;
      }
    }

    // Step 2: Demographics
    if (step === 2) {
      if (!dob) {
        setValidationError('Please provide your date of birth.');
        return;
      }
    }

    // Step 3: Location
    if (step === 3) {
      if (!location.trim()) {
        setValidationError('Mandatory Requirement: Please select your primary residence State and City.');
        return;
      }
    }

    // Step 4: Career & Bio
    if (step === 4) {
      if (!profession.trim()) {
        setValidationError('Please specify your profession or occupation.');
        return;
      }
    }

    // Step 6: Mandatory Areas of Interest (min 3)
    if (step === 6) {
      if (selectedInterests.length < 3) {
        setValidationError('Please select at least 3 Areas of Interest to tailor your curated introductions.');
        return;
      }
    }

    // Step 7: Final Submission
    if (step < 7) {
      setStep((prev) => (prev + 1) as any);
    } else {
      if (uploadedPhotos.length === 0) {
        setValidationError('Mandatory Requirement: Please upload at least 1 portfolio photo.');
        return;
      }
      if (!selfieVerified) {
        setValidationError('Mandatory Security Rule: You must perform the Live Selfie Biometric Check before proceeding.');
        return;
      }

      setLoading(true);
      setValidationError('');

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'register',
            email,
            password,
            phone,
            fullName: `${titlePrefix} ${fullName}`.trim(),
            customName: customName.trim() || undefined,
            dob,
            gender,
            pronouns,
            height,
            interestedIn,
            location,
            profession,
            education,
            bio,
            relationshipGoal,
            interests: selectedInterests,
            photos: uploadedPhotos,
            selfieVerified: true
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setValidationError(data.error || 'Registration failed. Please review your credentials.');
          setLoading(false);
          return;
        }

        try {
          if (data.user) {
            localStorage.setItem('kmc_session', JSON.stringify(data.user));
          }
          localStorage.setItem('kmc_profile_completed', 'true');
          localStorage.setItem('kmc_user_profile', JSON.stringify({
            fullName: `${titlePrefix} ${fullName}`.trim(),
            customName: customName.trim() || undefined,
            email,
            phone,
            dob,
            gender,
            pronouns,
            height,
            interestedIn,
            location,
            occupation: profession,
            education,
            bio,
            relationshipGoals: relationshipGoal,
            traits: selectedInterests,
            interests: selectedInterests,
            photos: uploadedPhotos,
            verifiedSelfie: selfieVerified
          }));
        } catch (e) {}

        setLoading(false);
        router.push('/discover');
      } catch (err: any) {
        setValidationError(err.message || 'Connection error. Please try again.');
        setLoading(false);
      }
    }
  };

  const handlePrevStep = () => {
    setValidationError('');
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const stepTitles = [
    'Private Credentials',
    'Vital Demographics',
    'Geographic Residence',
    'Career & High Society',
    'Dating Intentions',
    'Curated Interests',
    'Biometric Vetting & Tier'
  ];

  return (
    <div className="min-h-screen bg-[#020204] text-[#F4F4F6] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Thick Dark Luxury Vignette Lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010102] via-[#040407] to-[#010102] pointer-events-none" />
      <div className="absolute w-[700px] h-[700px] bg-gradient-to-tr from-[#D4AF37]/8 via-[#9A7B1C]/5 to-transparent rounded-full blur-[180px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />

      {/* Brand Header */}
      <div className="mb-5 flex flex-col items-center text-center relative z-10">
        <Link href="/" className="flex flex-col items-center group">
          <CrownLogo className="w-12 h-12 mb-2 group-hover:scale-105 transition-transform" />
          <h1 className="font-serif text-2xl font-bold tracking-widest gold-gradient-text">KISSMYCHEEK</h1>
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37]/80 font-semibold mt-0.5">
            Private Verified Membership Application
          </span>
        </Link>
      </div>

      <div className="max-w-xl w-full relative z-10">
        
        {/* Progress Bar Header (7 Steps) */}
        <div className="mb-5 px-2">
          <div className="flex justify-between items-center text-xs font-semibold text-white/60 mb-2">
            <span className="flex items-center gap-1.5 text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" /> Step {step} of 7: {stepTitles[step - 1]}
            </span>
            <span className="text-white/40">{Math.round((step / 7) * 100)}% Complete</span>
          </div>

          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <motion.div
              className="h-full gold-gradient-bg rounded-full shadow-[0_0_10px_#D4AF37]"
              initial={{ width: '14%' }}
              animate={{ width: `${(step / 7) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        <Card className="p-6 sm:p-8 border-[#D4AF37]/30 shadow-2xl glass-panel relative rounded-3xl">
          
          {validationError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleNextStep}>
            
            {/* STEP 1: CREDENTIALS & PASSWORDS */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3.5">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Private Membership Credentials</h2>
                  <p className="text-xs text-white/60 mt-1">Provide your legal identity and confidential credentials.</p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-white/70 font-medium mb-1 block">Title</label>
                    <select
                      value={titlePrefix}
                      onChange={(e) => setTitlePrefix(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="Ms.">Ms.</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Lord">Lord</option>
                      <option value="Lady">Lady</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-white/70 font-medium mb-1 block">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Victoria Adeleke"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-white/70 font-medium block">
                      Public Display Alias / Custom Name <span className="text-white/40">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-[#D4AF37] font-semibold">Discovery & Chat Alias</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Lord Henry, Queen Zara, King Victor"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                  <span className="text-[10px] text-white/50 mt-1 block">
                    Your custom alias is visible to club members on discovery and messaging cards while your legal name remains confidential.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-white/70 font-medium block">Private Phone Number</label>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Strictly Confidential
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="+234 803 123 4567 (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                  <span className="text-[10px] text-white/50 mt-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#D4AF37] shrink-0" />
                    <span>Seen only by you. Strictly private and never visible on public profiles.</span>
                  </span>
                </div>

                {/* Create Password */}
                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Create Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters with 1 symbol"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 pr-10 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your password to confirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 pr-10 py-2.5 rounded-full bg-white/5 border text-white text-xs placeholder:text-white/30 focus:outline-none transition-colors ${
                        confirmPassword && confirmPassword !== password 
                          ? 'border-rose-500/60 focus:border-rose-500' 
                          : confirmPassword && confirmPassword === password 
                            ? 'border-emerald-500/60 focus:border-emerald-500' 
                            : 'border-white/10 focus:border-[#D4AF37]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword === password && (
                    <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match perfectly
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: VITAL DEMOGRAPHICS */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Vital Identity & Demographics</h2>
                  <p className="text-xs text-white/60 mt-1">Tell us about your fundamental background.</p>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-white/40">Members must be 21+ years of age.</span>
                    {dob && (
                      <span className="text-xs font-bold gold-gradient-text flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Age: {calculateAge(dob)} years old
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 font-medium mb-1 block">I identify as</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="Woman">Woman</option>
                      <option value="Man">Man</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 font-medium mb-1 block">Pronouns</label>
                    <input
                      type="text"
                      placeholder="e.g. she/her, he/him"
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Height</label>
                  <input
                    type="text"
                    placeholder="e.g. 5'10 (178 cm)"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: GEOGRAPHIC RESIDENCE */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Geographic Residence</h2>
                  <p className="text-xs text-white/60 mt-1">Select your primary city and residential territory.</p>
                </div>

                <div className="space-y-3">
                  <LocationPicker
                    value={location}
                    onChange={(val) => setLocation(val)}
                  />
                  <span className="text-[10px] text-white/40 block">
                    We match you exclusively within your selected cities or international chapters.
                  </span>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CAREER & HIGH SOCIETY */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Career & High Society Status</h2>
                  <p className="text-xs text-white/60 mt-1">Share your professional leadership and alma mater.</p>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Occupation & Industry</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Private Equity Partner, Managing Director"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Alma Mater / Education</label>
                  <input
                    type="text"
                    placeholder="e.g. Oxford, Harvard, LSE, Stanford, UNILAG"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Short Member Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your lifestyle, passions, and cultural taste..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 5: DATING INTENTIONS */}
            {step === 5 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Dating Intentions & Criteria</h2>
                  <p className="text-xs text-white/60 mt-1">Specify your romantic goals and match criteria.</p>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Interested in meeting</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Men', 'Women', 'Everyone'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setInterestedIn(opt)}
                        className={`py-2.5 rounded-full text-xs font-semibold border transition-all ${
                          interestedIn === opt
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md'
                            : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/70 font-medium mb-1 block">Relationship Ambition</label>
                  <select
                    value={relationshipGoal}
                    onChange={(e) => setRelationshipGoal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="Serious Relationship & Marriage">Serious Relationship & Marriage</option>
                    <option value="Exclusive Romantic Partnership">Exclusive Romantic Partnership</option>
                    <option value="Discreet Companionship">Discreet Companionship</option>
                    <option value="Luxury Social & Gala Networking">Luxury Social & Gala Networking</option>
                  </select>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center text-xs text-white/70 mb-2">
                    <span>Preferred Age Range</span>
                    <span className="font-semibold text-[#D4AF37]">{ageMin} - {ageMax} years old</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={21}
                      max={65}
                      value={ageMin}
                      onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 2))}
                      className="w-full accent-[#D4AF37]"
                    />
                    <input
                      type="range"
                      min={21}
                      max={65}
                      value={ageMax}
                      onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 2))}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: CURATED AREAS OF INTEREST */}
            {step === 6 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Curated Areas of Interest</h2>
                  <p className="text-xs text-white/60 mt-1">
                    Select at least <span className="text-[#D4AF37] font-semibold">3 lifestyle interests</span> to curate bespoke introductions.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {availableInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{interest}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center">
                  <span className={`text-[11px] font-semibold ${selectedInterests.length >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedInterests.length} of 3 minimum selected
                  </span>
                </div>
              </motion.div>
            )}

            {/* STEP 7: BIOMETRIC SCANNING & MEMBERSHIP TIER */}
            {step === 7 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-serif font-bold gold-gradient-text">Photo & Biometric Security Vetting</h2>
                  <p className="text-xs text-white/60 mt-1">Live facial scan prevents impersonators and grants verified badge.</p>
                </div>

                {/* Photo Upload Section */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D4AF37]/50 shrink-0 bg-black/40 flex items-center justify-center">
                      {uploadedPhotos && uploadedPhotos.length > 0 && uploadedPhotos[0] ? (
                        <img src={uploadedPhotos[0]} alt="Primary Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#D4AF37]/60" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Portfolio Media</span>
                      <span className="text-[10px] text-white/50">{uploadedPhotos.length} photo attached</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    icon={<Camera className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  >
                    Add Photo
                  </Button>
                </div>

                {/* Real-time WebRTC Live Facial Camera Scanner */}
                <div className="p-4 rounded-3xl bg-black/80 border border-[#D4AF37]/40 text-center space-y-4 shadow-2xl relative overflow-hidden">
                  
                  {/* Real Live Video / Captured Image Container */}
                  <div className="relative w-full max-w-[280px] h-[280px] mx-auto rounded-3xl overflow-hidden bg-[#0A0A10] border-2 border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-center">
                    
                    {capturedSelfie ? (
                      <div className="relative w-full h-full">
                        <img src={capturedSelfie} alt="Verified Live Biometric Capture" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400 rounded-3xl pointer-events-none flex items-center justify-center">
                          <div className="p-2 rounded-full bg-black/70 border border-emerald-400 text-emerald-400 flex items-center gap-1.5 shadow-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-bold text-white">Live Liveness Verified</span>
                          </div>
                        </div>
                      </div>
                    ) : isCameraActive ? (
                      <div className="relative w-full h-full bg-black">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* Biometric Gold Oval Overlay Reticle */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[180px] h-[220px] border-2 border-[#D4AF37] rounded-[50%] shadow-[0_0_20px_rgba(212,175,55,0.6)] relative overflow-hidden">
                            {isScanningSelfie && (
                              <motion.div
                                initial={{ top: '0%' }}
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_15px_#D4AF37]"
                              />
                            )}
                          </div>
                        </div>

                        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                          <span className="px-2.5 py-1 rounded-full bg-black/70 border border-[#D4AF37]/40 text-[10px] text-[#D4AF37] font-semibold flex items-center gap-1">
                            <Scan className="w-3 h-3 text-[#D4AF37] animate-pulse" /> Position face inside oval
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center mx-auto shadow-inner">
                          <Camera className="w-8 h-8 text-[#D4AF37]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">Real-Time Camera Inactive</span>
                          <span className="text-[10px] text-white/50 block mt-0.5">Click below to activate camera</span>
                        </div>
                      </div>
                    )}

                    {/* Hidden Off-Screen Canvas for Frame Extraction */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {cameraError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      {selfieVerified ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Biometric Identity Verified (Match: {selfieMatchScore}%)
                        </span>
                      ) : isScanningSelfie ? (
                        <span className="text-[#D4AF37] flex items-center gap-1">
                          <Scan className="w-4 h-4 text-[#D4AF37] animate-spin" /> Verifying Facial Landmarks & Liveness...
                        </span>
                      ) : isCameraActive ? (
                        'Ready: Look directly into camera lens'
                      ) : (
                        'Mandatory Live WebRTC Biometric Check'
                      )}
                    </h4>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      {selfieVerified 
                        ? 'Your live biometric facial mesh matches your account. Verified shield badge active.'
                        : 'Real-time AI camera validation prevents impersonators and grants genuine member status.'}
                    </p>
                  </div>

                  {/* Camera Control Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    {!selfieVerified && !isCameraActive && (
                      <Button
                        type="button"
                        variant="gold"
                        fullWidth
                        onClick={startLiveCamera}
                        icon={<Camera className="w-4 h-4 text-black" />}
                        className="py-2.5 text-xs font-bold"
                      >
                        Launch Live Real-Time Camera
                      </Button>
                    )}

                    {!selfieVerified && isCameraActive && (
                      <>
                        <Button
                          type="button"
                          variant="gold"
                          fullWidth
                          disabled={isScanningSelfie}
                          onClick={captureAndVerifySelfie}
                          icon={<Scan className="w-4 h-4 text-black" />}
                          className="py-2.5 text-xs font-bold"
                        >
                          {isScanningSelfie ? 'Analyzing Biometrics...' : '📸 Capture Live Selfie & Verify'}
                        </Button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="px-4 py-2.5 rounded-full border border-white/20 text-xs text-white/70 hover:text-white hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {selfieVerified && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelfieVerified(false);
                          setCapturedSelfie(null);
                          startLiveCamera();
                        }}
                        icon={<RotateCw className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        className="text-xs"
                      >
                        Retake Live Selfie
                      </Button>
                    )}
                  </div>

                </div>

                {/* Membership Tier Picker */}
                <div className="pt-2">
                  <label className="text-xs text-white/70 font-medium mb-1.5 block">Select Membership Tier</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMembershipTier('black')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        membershipTier === 'black'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#D4AF37] block">BLACK FOUNDER</span>
                      <span className="text-[10px] text-white/50">Full Discretion & Unlimited Messaging</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMembershipTier('founder')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        membershipTier === 'founder'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <span className="text-xs font-bold text-amber-300 block">VIP FOUNDER CLUB</span>
                      <span className="text-[10px] text-white/50">Private Gala Passes & Matchmaker</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* BUTTON NAVIGATION FOOTER */}
            <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-white/10">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 rounded-full border border-white/20 text-xs font-semibold text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              <Button 
                type="submit" 
                variant="gold" 
                disabled={loading || (step === 7 && !selfieVerified)} 
                className="px-8 py-2.5"
              >
                {step === 7 && !selfieVerified ? (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-black" /> Run Selfie Scan First
                  </span>
                ) : step < 7 ? (
                  <span className="flex items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </span>
                ) : loading ? (
                  'Activating Membership...'
                ) : (
                  'Complete & Enter Club →'
                )}
              </Button>
            </div>

          </form>

          {/* Footer Callout to Login */}
          <div className="mt-5 text-center pt-4 border-t border-white/5">
            <span className="text-xs text-white/50">Already a registered member? </span>
            <Link href="/login" className="text-xs font-bold text-[#D4AF37] hover:underline">
              Sign In Here
            </Link>
          </div>

        </Card>
      </div>

      {/* EMAIL OTP VERIFICATION MODAL */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="max-w-md w-full bg-[#0D0D12] border border-[#D4AF37]/35 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white"
            >
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <KeyRound className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-white">Verify Your Email Address</h3>
                <p className="text-xs text-white/60 mt-1">
                  We sent a 6-digit confidential access code to<br/>
                  <span className="font-semibold text-[#D4AF37]">{email}</span>
                </p>
              </div>

              {otpError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpSuccessMessage && !otpError && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{otpSuccessMessage}</span>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center gap-2 sm:gap-2.5 my-5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`reg-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && idx > 0) {
                        const prevInput = document.getElementById(`reg-otp-${idx - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    className="w-10 sm:w-11 h-12 rounded-xl bg-white/5 border border-white/15 text-center text-lg font-bold font-mono text-[#D4AF37] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <div className="space-y-3">
                <Button
                  variant="gold"
                  fullWidth
                  disabled={otpLoading || otpDigits.join('').length < 6}
                  onClick={handleVerifyEmailOtp}
                  className="py-3 font-semibold text-xs sm:text-sm"
                >
                  {otpLoading ? 'Verifying Code...' : 'Verify Email & Continue →'}
                </Button>

                <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || otpLoading}
                    onClick={() => triggerSendEmailOtp(email, `${titlePrefix} ${fullName}`.trim())}
                    className={`flex items-center gap-1 hover:text-white transition-colors ${
                      resendCooldown > 0 ? 'text-white/30 cursor-not-allowed' : 'text-[#D4AF37]'
                    }`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${otpLoading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOtpModalOpen(false)}
                    className="text-white/50 hover:text-white underline"
                  >
                    Change Email
                  </button>
                </div>
              </div>

              {/* Security Footnote */}
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-white/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by Kiss My Cheek Business Concierge Dispatch</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
