'use client';

/**
 * VidSnap.AI Business & Collab Hub (/business)
 * Marketplace for brand campaigns, creator sponsorship discovery,
 * pitch submissions, brand-safety evaluation, and applicant reviews.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Megaphone,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building2,
  DollarSign,
  Users,
  Search,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  BusinessProfile,
  Campaign,
  CollabApplication,
} from '@/lib/types';

export default function BusinessHubPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'brand_manager' | 'my_collabs'>('marketplace');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myCollabs, setMyCollabs] = useState<CollabApplication[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Apply Modal State
  const [applyCampaign, setApplyCampaign] = useState<Campaign | null>(null);
  const [applyPitch, setApplyPitch] = useState('');
  const [applyPortfolioId, setApplyPortfolioId] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);

  // New Campaign Modal State
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('tech');
  const [newBudget, setNewBudget] = useState('');
  const [newTargetCreators, setNewTargetCreators] = useState(3);
  const [newRequirements, setNewRequirements] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [createCampaignLoading, setCreateCampaignLoading] = useState(false);

  // Campaign Applications View State
  const [viewCampaignApps, setViewCampaignApps] = useState<Campaign | null>(null);
  const [campaignApps, setCampaignApps] = useState<CollabApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Feedback Notification
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const campList = await api.business.listCampaigns(
        selectedCategory === 'all' ? undefined : selectedCategory
      );
      setCampaigns(campList);

      if (user) {
        const [myApps, bizProf] = await Promise.all([
          api.business.getMyCollabs().catch(() => []),
          api.business.getProfile().catch(() => null),
        ]);
        setMyCollabs(myApps);
        setBusinessProfile(bizProf);
      }
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, selectedCategory]);

  // Handle Creator Application
  const handleApplyToCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyCampaign) return;

    try {
      setApplySubmitting(true);
      await api.business.applyToCampaign(
        applyCampaign.campaign_id,
        applyPitch,
        applyPortfolioId || undefined
      );
      setBannerMsg(`Application submitted to ${applyCampaign.company_name}! 🚀`);
      setApplyCampaign(null);
      setApplyPitch('');
      setApplyPortfolioId('');
      await loadData();
    } catch (err: any) {
      setBannerMsg(err.message || 'Application submission failed');
    } finally {
      setApplySubmitting(false);
    }
  };

  // Handle Campaign Creation (Brand Owner)
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateCampaignLoading(true);
      const reqs = newRequirements
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      await api.business.createCampaign({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        budget_perk: newBudget,
        target_creators_count: Number(newTargetCreators),
        requirements: reqs,
        deadline: new Date(newDeadline).toISOString(),
      });

      setBannerMsg('Campaign brief published to Collab Marketplace! 📢');
      setShowNewCampaignModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewBudget('');
      setNewRequirements('');
      setNewDeadline('');
      await loadData();
    } catch (err: any) {
      setBannerMsg(err.message || 'Campaign creation failed');
    } finally {
      setCreateCampaignLoading(false);
    }
  };

  // View Applications for a Campaign
  const handleViewApplications = async (camp: Campaign) => {
    try {
      setAppsLoading(true);
      setViewCampaignApps(camp);
      const apps = await api.business.getCampaignApplications(camp.campaign_id);
      setCampaignApps(apps);
    } catch (err: any) {
      setBannerMsg(err.message || 'Could not load applications');
    } finally {
      setAppsLoading(false);
    }
  };

  // Update Application Status (Accept / Shortlist / Reject)
  const handleStatusUpdate = async (appId: string, status: any) => {
    try {
      await api.business.updateApplicationStatus(appId, status);
      setBannerMsg(`Applicant marked as ${status}!`);
      if (viewCampaignApps) {
        const apps = await api.business.getCampaignApplications(viewCampaignApps.campaign_id);
        setCampaignApps(apps);
      }
    } catch (err: any) {
      setBannerMsg(err.message || 'Status update failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '88px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Banner Alert */}
        {bannerMsg && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{bannerMsg}</span>
            <button
              onClick={() => setBannerMsg(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* HERO HEADER */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-light)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <Briefcase size={16} />
              <span>SPONSORSHIP & COLLABORATION PLATFORM</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 10px 0' }}>
              Collab Marketplace & Brand Hub 💼
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '650px', fontSize: '0.95rem' }}>
              Connecting verified brands with creators for high-engagement short video campaigns, transparent terms, and brand-safety verification.
            </p>
          </div>

          {user && (
            <div>
              <button
                onClick={() => setShowNewCampaignModal(true)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Megaphone size={16} />
                Post Campaign Brief
              </button>
            </div>
          )}
        </div>

        {/* SECTION TABS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '12px',
            marginBottom: '28px',
          }}
        >
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'marketplace' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'marketplace' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'marketplace' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Briefcase size={16} />
            Collab Marketplace 🌐
          </button>

          {user && (
            <>
              <button
                onClick={() => setActiveTab('my_collabs')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  background: activeTab === 'my_collabs' ? 'var(--primary-gradient)' : 'transparent',
                  color: activeTab === 'my_collabs' ? '#fff' : 'var(--text-secondary)',
                  border: activeTab === 'my_collabs' ? 'none' : '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Users size={16} />
                My Pitches & Collabs 🤝 ({myCollabs.length})
              </button>

              <button
                onClick={() => setActiveTab('brand_manager')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  background: activeTab === 'brand_manager' ? 'var(--primary-gradient)' : 'transparent',
                  color: activeTab === 'brand_manager' ? '#fff' : 'var(--text-secondary)',
                  border: activeTab === 'brand_manager' ? 'none' : '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Building2 size={16} />
                Brand Manager 📢
              </button>
            </>
          )}
        </div>

        {/* TAB 1: COLLAB MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div>
            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {['all', 'tech', 'lifestyle', 'fitness', 'gaming', 'comedy', 'music'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: selectedCategory === cat ? 'var(--primary-light)' : 'var(--text-secondary)',
                    border: selectedCategory === cat ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Campaign Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {campaigns.map((camp) => (
                <div
                  key={camp.campaign_id}
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={14} /> {camp.company_name}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {camp.budget_perk}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                      {camp.title}
                    </h3>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      {camp.description}
                    </p>

                    {camp.requirements.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                          Requirements:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {camp.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      <span>{camp.applications_count} applicants</span>
                      <span>Target: {camp.target_creators_count} creators</span>
                    </div>

                    {user ? (
                      <button
                        onClick={() => setApplyCampaign(camp)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Send size={14} />
                        Apply to Collab
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', textAlign: 'center', display: 'block' }}
                      >
                        Log in to Pitch
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MY COLLABS */}
        {activeTab === 'my_collabs' && (
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              Your Submitted Collaboration Pitches
            </h2>
            {myCollabs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myCollabs.map((collab) => (
                  <div
                    key={collab.application_id}
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Campaign: {collab.campaign_id}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background:
                              collab.status === 'accepted'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : collab.status === 'shortlisted'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color:
                              collab.status === 'accepted'
                                ? '#10b981'
                                : collab.status === 'shortlisted'
                                ? '#38bdf8'
                                : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {collab.status}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 6px 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        "{collab.pitch}"
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Submitted on {new Date(collab.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span style={{ color: collab.brand_safety.is_brand_safe ? '#10b981' : '#f43f5e' }}>
                          Brand Safety Score: {collab.brand_safety.score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Briefcase size={36} style={{ opacity: 0.5, marginBottom: '10px' }} />
                <div>You haven't pitched to any campaigns yet.</div>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '14px' }}
                >
                  Browse Collab Marketplace
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BRAND MANAGER (FOR BRAND OWNERS) */}
        {activeTab === 'brand_manager' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                Your Brand Campaigns & Applicants
              </h2>
              <button
                onClick={() => setShowNewCampaignModal(true)}
                className="btn btn-primary btn-sm"
              >
                + New Campaign Brief
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {campaigns
                .filter((c) => c.business_id === businessProfile?.business_id)
                .map((camp) => (
                  <div
                    key={camp.campaign_id}
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                        {camp.title}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Budget: {camp.budget_perk} • Applicants: {camp.applications_count}
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewApplications(camp)}
                      className="btn btn-secondary btn-sm"
                    >
                      Review Applicants ({camp.applications_count})
                    </button>
                  </div>
                ))}

              {campaigns.filter((c) => c.business_id === businessProfile?.business_id).length === 0 && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Megaphone size={36} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <div>No campaigns posted yet. Click "+ New Campaign Brief" above to recruit creators!</div>
                </div>
              )}
            </div>

            {/* Application Review Drawer / Section */}
            {viewCampaignApps && (
              <div
                style={{
                  marginTop: '32px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                    Applicants for: "{viewCampaignApps.title}"
                  </h3>
                  <button
                    onClick={() => setViewCampaignApps(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    ✕ Close
                  </button>
                </div>

                {campaignApps.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {campaignApps.map((app) => (
                      <div
                        key={app.application_id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-md)',
                          padding: '18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '16px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{app.creator_name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{app.creator_handle}</span>
                            <span
                              style={{
                                padding: '1px 8px',
                                borderRadius: '999px',
                                background: app.brand_safety.is_brand_safe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: app.brand_safety.is_brand_safe ? '#10b981' : '#f43f5e',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              Brand Safety: {app.brand_safety.score}/100
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            "{app.pitch}"
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleStatusUpdate(app.application_id, 'shortlisted')}
                            className="btn btn-secondary btn-sm"
                          >
                            Shortlist
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(app.application_id, 'accepted')}
                            className="btn btn-primary btn-sm"
                            style={{ background: '#10b981' }}
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(app.application_id, 'rejected')}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f43f5e' }}
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No applications received for this campaign yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* APPLY TO CAMPAIGN MODAL */}
        {applyCampaign && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#0f172a',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
              }}
            >
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                Pitch for: {applyCampaign.title}
              </h2>
              <div style={{ color: 'var(--primary-light)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Reward: {applyCampaign.budget_perk} • Brand: {applyCampaign.company_name}
              </div>

              <form onSubmit={handleApplyToCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Your Pitch to Brand *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    placeholder="Describe your creative concept for this reel and why you are a great match for their brand..."
                    value={applyPitch}
                    onChange={(e) => setApplyPitch(e.target.value)}
                    className="input"
                    rows={4}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Portfolio Reel ID / Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vid_your_best_tech_reel"
                    value={applyPortfolioId}
                    onChange={(e) => setApplyPortfolioId(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setApplyCampaign(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting}
                    className="btn btn-primary"
                  >
                    {applySubmitting ? 'Submitting Pitch...' : 'Submit Collab Pitch 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE CAMPAIGN BRIEF MODAL */}
        {showNewCampaignModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#0f172a',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0' }}>
                Post a Campaign Brief 📢
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Publish a campaign to invite pitches from verified short-form video creators.
              </p>

              <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Noise-Cancelling Earbuds Showcase"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Category Niche *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="tech">Technology & AI</option>
                    <option value="lifestyle">Lifestyle & Fashion</option>
                    <option value="fitness">Health & Fitness</option>
                    <option value="gaming">Gaming</option>
                    <option value="comedy">Comedy & Entertainment</option>
                    <option value="music">Music & Beats</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Budget / Creator Perk *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $800 + Free Product Sample or ₹30,000 INR"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Target Number of Creators
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newTargetCreators}
                    onChange={(e) => setNewTargetCreators(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Campaign Brief & Deliverables *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    placeholder="Describe what kind of short video content you are seeking, key talking points, and visual style..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="input"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Specific Requirements (one per line)
                  </label>
                  <textarea
                    placeholder="Must be vertical 9:16 format&#10;Tag #BrandName in caption&#10;Video length between 30-45s"
                    value={newRequirements}
                    onChange={(e) => setNewRequirements(e.target.value)}
                    className="input"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewCampaignModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCampaignLoading}
                    className="btn btn-primary"
                  >
                    {createCampaignLoading ? 'Publishing...' : 'Publish Brief 📢'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
