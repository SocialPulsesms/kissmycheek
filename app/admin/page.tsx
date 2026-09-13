'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Heart, 
  ShieldAlert, 
  Check, 
  X, 
  Search, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  UserX,
  LogOut,
  BarChart3,
  Activity,
  Zap,
  Video,
  Clock,
  Filter,
  ArrowUpRight,
  Sparkles,
  Crown,
  Headphones,
  Flame,
  CreditCard,
  Send,
  MessageSquare,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  MoreVertical,
  ChevronRight,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { performLogout } from '@/lib/authClient';
import { SupportTicket } from '@/lib/supportStore';
import { NaughtyPost } from '@/lib/naughtyZoneStore';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'support' | 'kyc' | 'naughty' | 'finance' | 'logs'>('overview');
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingKYCQueue, setPendingKYCQueue] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [naughtyPosts, setNaughtyPosts] = useState<NaughtyPost[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeEliteMembers: 0,
    suspendedMembers: 0,
    monthlyRevenue: 0,
    matchesCreated: 0,
    pendingKYCCount: 0,
    openTicketsCount: 0,
    systemHealth: '100% Operational (99.99% SLA)'
  });

  // Action / Feedback Toast
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userTierFilter, setUserTierFilter] = useState('ALL');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');

  // Selected Item Modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Custom User Action Dialog
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState(100);
  const [adminDispatchMessage, setAdminDispatchMessage] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ message, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch {}
    localStorage.removeItem('kmc_session');
    window.location.replace('/admin/login');
  };

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin');
      if (res.status === 401 || res.status === 403) {
        window.location.replace('/admin/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list = data.usersList || [];
          setUsersList(list);
          setSelectedUser((prev: any) => {
            if (!prev) return null;
            const updated = list.find((u: any) => u.id === prev.id || u.email === prev.email);
            return updated ? { ...prev, ...updated } : prev;
          });
          setPendingKYCQueue(data.pendingQueue || []);
          setSupportTickets(data.supportTickets || []);
          setNaughtyPosts(data.naughtyPosts || []);
          setTransactions(data.transactions || []);
          setAuditLogs(data.auditLogs || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      }
    } catch {
      console.log('Error refreshing admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 15000); // 15s live poll
    return () => clearInterval(interval);
  }, []);

  // 1. Suspend / Reinstate User
  const handleToggleUserSuspension = async (user: any) => {
    const isCurrentlySuspended = user.isSuspended;
    const action = isCurrentlySuspended ? 'unsuspend_user' : 'suspend_user';
    const reason = isCurrentlySuspended ? '' : 'Violations of Kiss My Cheek VIP Safety Code';

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        fetchAdminData();
        if (selectedUser?.id === user.id) {
          setSelectedUser({ ...selectedUser, isSuspended: !isCurrentlySuspended });
        }
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error processing suspension', 'error');
    }
  };

  // 2. Change Member Tier
  const handleUpdateMemberTier = async (userId: string, newTier: 'STANDARD' | 'PREMIUM' | 'ELITE' | 'FOUNDER') => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_tier', userId, tier: newTier })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        fetchAdminData();
        if (selectedUser) setSelectedUser({ ...selectedUser, tier: newTier });
      }
    } catch {
      showToast('Failed to update membership tier', 'error');
    }
  };

  // 3. Grant / Adjust Credits
  const handleAdjustCredits = async (userId: string, amount: number, userEmail?: string) => {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid credit amount', 'error');
      return;
    }

    // Optimistic UI update for instantaneous feedback
    setSelectedUser((prev: any) => (prev && (prev.id === userId || prev.email === userId || (userEmail && prev.email === userEmail)))
      ? { ...prev, creditsBalance: (Number(prev.creditsBalance) || 0) + numAmount }
      : prev
    );
    setUsersList(prev => prev.map(u => (u.id === userId || u.email === userId || (userEmail && u.email === userEmail))
      ? { ...u, creditsBalance: (Number(u.creditsBalance) || 0) + numAmount }
      : u
    ));

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_credits', userId, userEmail, amount: numAmount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        const resolvedBalance = typeof data.newBalance === 'number' ? data.newBalance : undefined;
        if (resolvedBalance !== undefined) {
          setSelectedUser((prev: any) => (prev && (prev.id === userId || prev.email === userId || (userEmail && prev.email === userEmail)))
            ? { ...prev, creditsBalance: resolvedBalance }
            : prev
          );
          setUsersList(prev => prev.map(u => (u.id === userId || u.email === userId || (userEmail && u.email === userEmail))
            ? { ...u, creditsBalance: resolvedBalance }
            : u
          ));
        }
        fetchAdminData();
      } else {
        showToast(data.error || 'Failed to adjust credits', 'error');
        fetchAdminData();
      }
    } catch {
      showToast('Failed to adjust credits', 'error');
      fetchAdminData();
    }
  };

  // 4. Reset User Password
  const handleResetPassword = async (userId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPasswordResult(data.tempPassword);
        showToast(`Temporary Key: ${data.tempPassword}`);
        fetchAdminData();
      }
    } catch {
      showToast('Failed to generate reset key', 'error');
    }
  };

  // 5. Send Admin Broadcast / Warning
  const handleSendAdminDispatch = async (userId: string) => {
    if (!adminDispatchMessage.trim()) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_admin_dispatch', userId, message: adminDispatchMessage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Official dispatch delivered to member inbox.');
        setAdminDispatchMessage('');
        fetchAdminData();
      }
    } catch {
      showToast('Failed to deliver dispatch', 'error');
    }
  };

  const adminPhotoInputRef = React.useRef<HTMLInputElement>(null);

  const handleAdminUploadUserPhoto = async (file: File) => {
    if (!selectedUser) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const newPhotoUrl = reader.result;
        const currentPhotos = selectedUser.photos || [];
        const updatedPhotos = [newPhotoUrl, ...currentPhotos.filter((p: string) => p !== newPhotoUrl)];

        // Optimistic UI update
        setSelectedUser((prev: any) => prev ? { ...prev, photos: updatedPhotos } : prev);
        setUsersList(prev => prev.map(u => (u.id === selectedUser.id || u.email === selectedUser.email) ? { ...u, photos: updatedPhotos } : u));

        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_user_photos',
              userId: selectedUser.id,
              userEmail: selectedUser.email,
              photos: updatedPhotos
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Member photo updated and synced successfully!');
            fetchAdminData();
          } else {
            showToast(data.error || 'Failed to update photo', 'error');
          }
        } catch {
          showToast('Failed to sync photo to server', 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // 6. Biometric KYC Approval / Rejection
  const handleApproveKYC = async (userId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_kyc', userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        fetchAdminData();
      }
    } catch {
      showToast('Failed to approve biometric KYC', 'error');
    }
  };

  const handleRejectKYC = async (userId: string) => {
    const reason = prompt('Specify reason for rejection:', 'Facial scan similarity below 95% threshold.') || 'Re-verification required.';
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_kyc', userId, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        fetchAdminData();
      }
    } catch {
      showToast('Failed to reject KYC', 'error');
    }
  };

  // 7. Support Ticket Staff Reply & Resolution
  const handleSendStaffTicketReply = async () => {
    if (!staffReplyText.trim() || !selectedTicket || isSubmittingReply) return;
    setIsSubmittingReply(true);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply_support_ticket',
          ticketId: selectedTicket.id,
          replyMessage: staffReplyText
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Official staff reply sent to member!');
        setStaffReplyText('');
        if (data.ticket) setSelectedTicket(data.ticket);
        fetchAdminData();
      }
    } catch {
      showToast('Failed to send staff reply', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_support_ticket', ticketId, status: 'RESOLVED' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Ticket marked as Resolved.');
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
        }
        fetchAdminData();
      }
    } catch {
      showToast('Failed to resolve ticket', 'error');
    }
  };

  // 8. Naughty Zone Moderation
  const handleDeleteNaughtyPost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this post from the Naughty Zone?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_naughty_post', postId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Post removed from Naughty Zone.');
        fetchAdminData();
      }
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  const handleFeatureNaughtyPost = async (postId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feature_naughty_post', postId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Post featured on #1 Gold Crown podium!');
        fetchAdminData();
      }
    } catch {
      showToast('Failed to feature post', 'error');
    }
  };

  // Filtered users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.phone?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.location?.toLowerCase().includes(userSearchQuery.toLowerCase());
    
    const matchesTier = userTierFilter === 'ALL' || 
      (userTierFilter === 'SUSPENDED' && u.isSuspended) ||
      (userTierFilter === 'VERIFIED' && u.verified) ||
      (u.tier === userTierFilter);

    return matchesSearch && matchesTier;
  });

  // Filtered tickets
  const filteredTickets = supportTickets.filter(t => {
    if (ticketStatusFilter === 'ALL') return true;
    return t.status === ticketStatusFilter;
  });

  return (
    <div className="min-h-screen bg-[#040407] text-[#F4F4F6] pb-24 relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* Top Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#D4AF37]/10 blur-[150px] pointer-events-none" />

      {/* Global Toast Notification */}
      {actionNotice && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-bounce ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs font-semibold">{actionNotice.message}</span>
        </div>
      )}

      {/* Executive Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-[#D4AF37]/20 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gold-gradient-bg flex items-center justify-center text-black shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-widest text-lg sm:text-xl font-bold gold-gradient-text">
                  KMC EXECUTIVE GOVERNANCE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 hidden sm:inline-block">
                  Master Control
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37]/80 font-semibold block -mt-0.5">
                Private Members Club Administration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#D4AF37] border border-white/10 transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link href="/discover">
              <Button variant="outline" size="sm" className="text-xs hidden sm:flex">
                View Member App
              </Button>
            </Link>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="p-1.5 bg-[#0D0D14] border border-[#D4AF37]/30 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xl">
          {[
            { id: 'overview', label: 'Dashboard & KPI', icon: BarChart3 },
            { id: 'users', label: `VIP Members (${usersList.length})`, icon: Users },
            { id: 'support', label: `Support & AI Desk (${supportTickets.filter(t => t.status !== 'RESOLVED').length})`, icon: Headphones, alert: supportTickets.filter(t => t.status === 'OPEN').length > 0 },
            { id: 'kyc', label: `Biometric KYC (${pendingKYCQueue.length})`, icon: ShieldCheck, alert: pendingKYCQueue.length > 0 },
            { id: 'naughty', label: `Naughty Zone (${naughtyPosts.length})`, icon: Flame },
            { id: 'finance', label: 'Flutterwave Ledger', icon: CreditCard },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
                  isSelected 
                    ? 'gold-gradient-bg text-black shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[#D4AF37]'}`} />
                <span>{tab.label}</span>
                {tab.alert && !isSelected && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* 1. DASHBOARD & KPI OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <Card className="p-5 border-[#D4AF37]/40 glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white/60">Total Registered Members</span>
                  <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">{metrics.totalMembers.toLocaleString()}</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> +14.2% verified this week
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-[#D4AF37]/40 glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white/60">Active Elite Circle</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Crown className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">{metrics.activeEliteMembers} Patrons</h3>
                  <p className="text-[11px] text-[#D4AF37] font-semibold mt-0.5">
                    ₦19,500/mo Subscriptions
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-[#D4AF37]/40 glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white/60">Monthly Gross Revenue</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">₦{(metrics.monthlyRevenue || 418500).toLocaleString()}</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                    Flutterwave & Cards Settlement
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-[#D4AF37]/40 glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white/60">Pending Approvals</span>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">{metrics.pendingKYCCount} KYC • {metrics.openTicketsCount} Tickets</h3>
                  <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                    Requires Staff Attention
                  </p>
                </div>
              </Card>

            </div>

            {/* Quick Actions & System Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Executive Control Hub (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="p-6 border-[#D4AF37]/30 glass-panel">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-lg font-bold text-white gold-gradient-text">Live Platform Operations</h3>
                    <Badge type="verified" label="ALL SYSTEMS NORMAL" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setActiveTab('support')}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/50 text-left transition-all group"
                    >
                      <Headphones className="w-6 h-6 text-[#D4AF37] mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-xs text-white">AI Concierge & Helpdesk</h4>
                      <p className="text-[10px] text-white/50 mt-1">Review member inquiries and dispatch admin replies.</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('kyc')}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/50 text-left transition-all group"
                    >
                      <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-xs text-white">Biometric Clearance</h4>
                      <p className="text-[10px] text-white/50 mt-1">Authenticate live selfie mesh against member portfolios.</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('naughty')}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/50 text-left transition-all group"
                    >
                      <Flame className="w-6 h-6 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-xs text-white">Naughty Zone Podium</h4>
                      <p className="text-[10px] text-white/50 mt-1">Moderate glamour reels and distribute ₦5M weekly prize pool.</p>
                    </button>
                  </div>
                </Card>

                {/* Recent High-Priority Tickets Preview */}
                <Card className="p-6 border-white/10 glass-panel">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-base text-white">Open Support Requests</h3>
                    <button onClick={() => setActiveTab('support')} className="text-xs text-[#D4AF37] font-semibold hover:underline flex items-center gap-1">
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {supportTickets.slice(0, 3).map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => { setSelectedTicket(ticket); setActiveTab('support'); }}
                        className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#D4AF37]/40 cursor-pointer flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={ticket.userAvatar} alt={ticket.userName} className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/40 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{ticket.userName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                                {ticket.userTier}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 truncate">{ticket.subject}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          {ticket.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* System Audit Stream (4 cols) */}
              <div className="lg:col-span-4">
                <Card className="p-6 border-white/10 glass-card h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif font-bold text-base text-white">Security Audit Log</h3>
                      <Activity className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="space-y-3">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="p-3 rounded-xl bg-black/50 border border-white/5 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                            <span className="font-mono text-[#D4AF37]">{log.action}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="text-white/80 leading-relaxed text-[11px]">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                    <span>Host: Node.js 20 • PostgreSQL</span>
                    <span className="text-emerald-400 font-semibold">SSL 256-Bit TLS</span>
                  </div>
                </Card>
              </div>

            </div>

          </div>
        )}

        {/* 2. VIP MEMBERS DIRECTORY & GOVERNANCE TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            {/* Search & Filter Bar */}
            <Card className="p-4 border-white/10 glass-card flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, phone, city..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {['ALL', 'ELITE', 'PREMIUM', 'STANDARD', 'VERIFIED', 'SUSPENDED'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setUserTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      userTierFilter === tier 
                        ? 'bg-[#D4AF37] text-black font-bold' 
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </Card>

            {/* Users Data Table */}
            <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/60 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Member</th>
                      <th className="p-4">Contact (Confidential)</th>
                      <th className="p-4">Tier & Verified</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Credits</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                        
                        {/* Member Identity */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.photos && user.photos.length > 0 && user.photos[0] && !user.photos[0].includes('unsplash.com') ? (
                              <img src={user.photos[0]} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/40 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E1B13] via-[#12110C] to-black border border-[#D4AF37]/40 flex items-center justify-center font-serif font-bold text-sm text-[#D4AF37] shrink-0">
                                {(user.name || 'M').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />}
                              </div>
                              <span className="text-[11px] text-white/50">{user.occupation}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="p-4 font-mono text-[11px]">
                          <span className="text-white block">{user.email}</span>
                          <span className="text-white/50">{user.phone}</span>
                        </td>

                        {/* Tier */}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            user.tier === 'ELITE' || user.tier === 'FOUNDER'
                              ? 'bg-gradient-to-r from-[#D4AF37]/30 to-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/50'
                              : 'bg-white/10 text-white/70 border border-white/20'
                          }`}>
                            {user.tier}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="p-4 text-white/80">
                          {user.location}
                        </td>

                        {/* Credits */}
                        <td className="p-4 font-bold text-[#D4AF37]">
                          {user.creditsBalance || 0} Credits
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          {user.isSuspended ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ACTIVE
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAdjustCredits(user.id, 500, user.email)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37] border border-[#D4AF37]/40 text-[#D4AF37] hover:text-black font-bold text-[11px] transition-all flex items-center gap-1"
                              title="Instantly grant 500 Credits for video calls & testing"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>+500</span>
                            </button>

                            <button
                              onClick={() => setSelectedUser(user)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
                            >
                              Govern
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. SUPPORT & AI CONCIERGE DESK TAB */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Tickets Queue (Lg: 5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-serif font-bold text-base text-white gold-gradient-text">Member Inquiries Queue</h3>
                <div className="flex items-center gap-1">
                  {['ALL', 'OPEN', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTicketStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        ticketStatusFilter === st ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/60'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-[#14141E] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10' 
                          : 'glass-panel border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold text-[#D4AF37]">{ticket.id}</span>
                        <div className="flex items-center gap-1.5">
                          {ticket.priority === 'URGENT_VIP' && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-500 text-white">
                              VIP URGENT
                            </span>
                          )}
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                            ticket.status === 'OPEN' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 my-1.5">
                        <img src={ticket.userAvatar} alt={ticket.userName} className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/40 shrink-0" />
                        <div>
                          <h4 className="font-serif font-bold text-sm text-white">{ticket.userName}</h4>
                          <span className="text-[10px] text-white/50">{ticket.userEmail}</span>
                        </div>
                      </div>

                      <p className="text-xs text-white/80 font-medium truncate mt-1">{ticket.subject}</p>
                      <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                        {ticket.messages[ticket.messages.length - 1]?.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Ticket Dispatch Console (Lg: 7 cols) */}
            <div className="lg:col-span-7">
              {(() => {
                const active = selectedTicket || supportTickets[0];
                if (!active) {
                  return (
                    <Card className="p-12 text-center border-white/10 h-96 flex flex-col items-center justify-center">
                      <Headphones className="w-10 h-10 text-white/20 mb-2" />
                      <p className="text-xs text-white/60">Select an inquiry from the queue to view and reply.</p>
                    </Card>
                  );
                }

                return (
                  <Card className="p-0 border-[#D4AF37]/40 shadow-2xl glass-panel flex flex-col h-[650px] overflow-hidden">
                    
                    {/* Header */}
                    <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#D4AF37]">{active.id}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/10 text-white">
                            {active.category}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-base text-white mt-1">{active.subject}</h3>
                        <p className="text-[11px] text-white/60">Patron: {active.userName} ({active.userEmail}) • {active.userTier} Tier</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {active.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolveTicket(active.id)}
                            className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-black font-bold text-xs transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                      {active.messages.map((msg) => {
                        const isStaff = msg.sender === 'ADMIN_SUPPORT';
                        const isAi = msg.sender === 'AI_CONCIERGE';
                        return (
                          <div
                            key={msg.id}
                            className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                              isStaff 
                                ? 'bg-gradient-to-r from-amber-500/20 via-[#14141E] to-[#14141E] border-[#D4AF37]/60 shadow-lg' 
                                : isAi
                                  ? 'bg-black/50 border-white/10 text-white/80'
                                  : 'bg-white/5 border-white/10 text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`font-bold flex items-center gap-1.5 ${isStaff ? 'text-[#D4AF37]' : isAi ? 'text-amber-300' : 'text-white'}`}>
                                {isStaff && <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />}
                                {msg.senderName}
                              </span>
                              <span className="text-[10px] text-white/40">{msg.timestamp}</span>
                            </div>
                            <p className="whitespace-pre-line text-white/90">{msg.content}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Staff Reply Box */}
                    <div className="p-4 bg-black/80 border-t border-white/10 shrink-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Quick Response Templates */}
                        <span className="text-[10px] uppercase font-bold text-[#D4AF37]">Quick Templates:</span>
                        {[
                          { label: 'Payment Credited', text: 'Greetings. Your Flutterwave payment has been authenticated and your credit vault has been updated immediately.' },
                          { label: 'KYC Verified', text: 'Your biometric verification has been manually approved by the Governance Desk. Your verified badge is now active.' },
                          { label: 'Account Restored', text: 'Your account review is complete and full club access has been restored.' }
                        ].map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setStaffReplyText(tpl.text)}
                            className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 text-[10px] text-white/70 hover:text-white transition-all whitespace-nowrap"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <textarea
                          rows={2}
                          placeholder="Type official staff response to member..."
                          value={staffReplyText}
                          onChange={(e) => setStaffReplyText(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none resize-none"
                        />
                        <button
                          onClick={handleSendStaffTicketReply}
                          disabled={!staffReplyText.trim() || isSubmittingReply}
                          className="px-5 py-3 rounded-2xl gold-gradient-bg text-black font-bold text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-1.5 shadow-md shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          <span>Send Reply</span>
                        </button>
                      </div>
                    </div>

                  </Card>
                );
              })()}
            </div>

          </div>
        )}

        {/* 4. BIOMETRIC KYC QUEUE TAB */}
        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-white gold-gradient-text">Identity & Biometric Selfie Verification Queue</h3>
              <Badge type="tier" label={`${pendingKYCQueue.length} PENDING AUDIT`} />
            </div>

            {pendingKYCQueue.length === 0 ? (
              <Card className="p-16 text-center border-white/10">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-xl text-white">Queue Cleared</h3>
                <p className="text-xs text-white/60 mt-1">All member biometric selfie checks have been authenticated.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingKYCQueue.map((item) => (
                  <Card key={item.id} className="p-6 border-[#D4AF37]/30 glass-card space-y-4">
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-lg text-white">{item.name}, {item.age}</h4>
                        <p className="text-xs text-[#D4AF37]">{item.location}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {item.biometricScore}% 3D Match
                      </span>
                    </div>

                    {/* Compare Images Side by Side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-white/50 block">Live Selfie</span>
                        <img src={item.selfieUrl} alt="Selfie" className="w-full h-48 object-cover rounded-2xl border border-white/10" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-white/50 block">Portfolio Match</span>
                        <img src={item.portfolioUrl} alt="Portfolio" className="w-full h-48 object-cover rounded-2xl border border-[#D4AF37]/30" />
                      </div>
                    </div>

                    {/* Decision Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleRejectKYC(item.userId)}
                        className="py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject & Request Rescan
                      </button>

                      <button
                        onClick={() => handleApproveKYC(item.userId)}
                        className="py-2.5 rounded-2xl gold-gradient-bg text-black font-bold text-xs hover:scale-105 transition-all flex items-center justify-center gap-1.5 shadow-lg"
                      >
                        <Check className="w-4 h-4" /> Issue Verified Crest
                      </button>
                    </div>

                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. NAUGHTY ZONE MODERATION TAB */}
        {activeTab === 'naughty' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-white gold-gradient-text">Naughty Zone Feed Moderation</h3>
                <p className="text-xs text-white/60">Review live uploads, feature top champions, or remove rule violations.</p>
              </div>
              <Badge type="tier" label="₦5,000,000 POOL ACTIVE" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {naughtyPosts.map((post) => (
                <Card key={post.id} className="p-0 border-[#D4AF37]/30 glass-card overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="relative h-64 w-full">
                      <img src={post.image} alt={post.author.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/40">
                        Rank #{post.rank}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-semibold bg-black/60 backdrop-blur-md p-2 rounded-xl">
                        {post.author.name} • {post.city}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-white/80 line-clamp-2">{post.caption}</p>
                      <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/10">
                        <span>🔥 {post.likesCount} Likes</span>
                        <span>💬 {post.dmsCount} DMs</span>
                        <span className="text-amber-400 font-bold">💎 {post.diamondsTipped}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-black/50 border-t border-white/10 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFeatureNaughtyPost(post.id)}
                      className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-1 border border-amber-500/30"
                    >
                      <Crown className="w-3.5 h-3.5" /> Boost #1
                    </button>

                    <button
                      onClick={() => handleDeleteNaughtyPost(post.id)}
                      className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1 border border-rose-500/30"
                    >
                      <X className="w-3.5 h-3.5" /> Remove Post
                    </button>
                  </div>

                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 6. FLUTTERWAVE FINANCE LEDGER TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-white gold-gradient-text">Flutterwave & Global Card Transactions</h3>
              <span className="text-xs font-mono text-emerald-400">Gateway Status: Online</span>
            </div>

            <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/60 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Patron</th>
                    <th className="p-4">Product / Purpose</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Gateway</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-[11px] text-[#D4AF37] font-bold">{tx.reference}</td>
                      <td className="p-4">
                        <span className="font-bold text-white block">{tx.user}</span>
                        <span className="text-[10px] text-white/50">{tx.email}</span>
                      </td>
                      <td className="p-4 text-white/80">{tx.type}</td>
                      <td className="p-4 font-bold text-white text-sm">{tx.amount}</td>
                      <td className="p-4 text-white/60">{tx.gateway}</td>
                      <td className="p-4 text-white/40">{tx.date}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. AUDIT LOGS TAB */}
        {activeTab === 'logs' && (
          <Card className="p-6 border-white/10 glass-panel space-y-4">
            <h3 className="font-serif font-bold text-lg text-white gold-gradient-text">Complete Administrative Audit Stream</h3>
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[#D4AF37]">{log.action}</span>
                      <span className="text-white/40">• By {log.adminName}</span>
                    </div>
                    <p className="text-white/90">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

      </main>

      {/* INSPECT / GOVERN USER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl glass-card border border-[#D4AF37]/50 shadow-2xl p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => { setSelectedUser(null); setTempPasswordResult(null); }}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                {selectedUser.photos && selectedUser.photos.length > 0 && selectedUser.photos[0] && !selectedUser.photos[0].includes('unsplash.com') ? (
                  <img src={selectedUser.photos[0]} alt={selectedUser.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] shadow-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1E1B13] via-[#12110C] to-black border-2 border-[#D4AF37] flex items-center justify-center font-serif font-bold text-2xl text-[#D4AF37] shadow-xl">
                    {(selectedUser.name || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => adminPhotoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#D4AF37] text-black shadow-md hover:scale-110 transition-transform"
                  title="Upload / Change Member Picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  type="file"
                  ref={adminPhotoInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAdminUploadUserPhoto(file);
                  }}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-xl text-white">{selectedUser.name}</h3>
                  {selectedUser.verified && <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />}
                  {selectedUser.isSuspended && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500 text-white">
                      Suspended
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60">{selectedUser.email} • {selectedUser.phone}</p>
                <p className="text-xs text-[#D4AF37] mt-0.5">{selectedUser.occupation} • {selectedUser.location}</p>
              </div>
            </div>

            {/* Member Current Status Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-[#D4AF37]/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Current Vault Balance:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-black font-extrabold text-xs">
                  {selectedUser.creditsBalance || 0} Credits
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold uppercase border border-white/20">
                  {selectedUser.tier || 'STANDARD'}
                </span>
              </div>

              {/* Launch Test Call */}
              <Link
                href={`/call/${selectedUser.id}?name=${encodeURIComponent(selectedUser.name)}&photo=${encodeURIComponent(selectedUser.photos?.[0] || '')}&mode=video`}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#c49f27] transition-all flex items-center gap-1.5 shadow-lg"
              >
                <Video className="w-4 h-4" />
                <span>Launch Test Video Call</span>
              </Link>
            </div>

            {/* Credit Grant Hub */}
            <div className="p-4 rounded-2xl bg-[#0B0B10] border border-[#D4AF37]/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Grant Date Credits (Zero-Barrier Testing)</span>
                </h4>
                <span className="text-[10px] text-white/50">Instantly funds user wallet for video dates</span>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAdjustCredits(selectedUser.id, amt, selectedUser.email)}
                    className="py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37] border border-[#D4AF37]/40 text-[#D4AF37] hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>+{amt}</span>
                  </button>
                ))}
              </div>

              {/* Custom Credit Amount */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  step={50}
                  placeholder="Custom credits (e.g. 1000)"
                  value={creditAdjustmentAmount || ''}
                  onChange={(e) => setCreditAdjustmentAmount(Number(e.target.value))}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleAdjustCredits(selectedUser.id, creditAdjustmentAmount, selectedUser.email)}
                  disabled={!creditAdjustmentAmount || creditAdjustmentAmount <= 0}
                  className="text-xs"
                >
                  Grant Custom Credits
                </Button>
              </div>
            </div>

            {/* Quick Governance Action Grid */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Governance & Tier Controls</h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* 1. Suspend / Reinstate */}
                <button
                  onClick={() => handleToggleUserSuspension(selectedUser)}
                  className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
                    selectedUser.isSuspended 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                  }`}
                >
                  {selectedUser.isSuspended ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{selectedUser.isSuspended ? 'Reinstate' : 'Suspend Account'}</span>
                </button>

                {/* 2. Upgrade to Elite */}
                <button
                  onClick={() => handleUpdateMemberTier(selectedUser.id, selectedUser.tier === 'ELITE' ? 'STANDARD' : 'ELITE')}
                  className="p-3 rounded-xl bg-amber-500/15 hover:bg-[#D4AF37] border border-[#D4AF37]/40 text-[#FFF6D6] hover:text-black font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <Crown className="w-4 h-4 text-[#D4AF37]" />
                  <span>{selectedUser.tier === 'ELITE' ? 'Demote Standard' : 'Set Elite (Unlimited)'}</span>
                </button>

                {/* 3. Approve Biometric KYC */}
                <button
                  onClick={() => handleApproveKYC(selectedUser.id)}
                  className="p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-200 hover:text-black font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Issue Verified Crest</span>
                </button>

                {/* 4. Reset Password */}
                <button
                  onClick={() => handleResetPassword(selectedUser.id)}
                  className="p-3 rounded-xl bg-purple-500/15 hover:bg-purple-500 border border-purple-500/40 text-purple-200 hover:text-black font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>Reset Password</span>
                </button>

              </div>

              {tempPasswordResult && (
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between">
                  <span>Temporary Access Key: <strong className="font-mono">{tempPasswordResult}</strong></span>
                </div>
              )}
            </div>

            {/* Direct Admin Dispatch Broadcast */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 block">Send Direct Admin Dispatch to this Member</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type an official governance notification..."
                  value={adminDispatchMessage}
                  onChange={(e) => setAdminDispatchMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleSendAdminDispatch(selectedUser.id)}
                  disabled={!adminDispatchMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
