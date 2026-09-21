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
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Textarea,
  FormField,
  Modal,
  EmptyState,
  Spinner,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import styles from './business.module.css';

const CATEGORIES = ['all', 'tech', 'lifestyle', 'fitness', 'gaming', 'comedy', 'music'];

export default function BusinessHubPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

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
      toastError('Failed to load marketplace campaigns');
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
      toastSuccess(`Application submitted to ${applyCampaign.company_name}!`);
      setApplyCampaign(null);
      setApplyPitch('');
      setApplyPortfolioId('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Application submission failed';
      toastError(msg);
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

      toastSuccess('Campaign brief published to Collab Marketplace!');
      setShowNewCampaignModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewBudget('');
      setNewRequirements('');
      setNewDeadline('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Campaign creation failed';
      toastError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load applications';
      toastError(msg);
    } finally {
      setAppsLoading(false);
    }
  };

  // Update Application Status (Accept / Shortlist / Reject)
  const handleStatusUpdate = async (appId: string, status: 'shortlisted' | 'accepted' | 'rejected') => {
    try {
      await api.business.updateApplicationStatus(appId, status);
      toastSuccess(`Applicant marked as ${status}!`);
      if (viewCampaignApps) {
        const apps = await api.business.getCampaignApplications(viewCampaignApps.campaign_id);
        setCampaignApps(apps);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      toastError(msg);
    }
  };

  return (
    <div className={styles.container}>
      {/* HERO HEADER */}
      <Card variant="default" className={styles.heroHeader} style={{ padding: 'var(--space-8)' }}>
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>
            <Briefcase size={16} />
            <span>Sponsorship & Collaboration Platform</span>
          </div>
          <h1 className={styles.heroTitle}>
            Collab Marketplace & Brand Hub
          </h1>
          <p className={styles.heroSubtitle}>
            Connecting verified brands with creators for high-engagement short video campaigns, transparent terms, and brand-safety verification.
          </p>
        </div>

        {user && (
          <div>
            <Button
              variant="primary"
              onClick={() => setShowNewCampaignModal(true)}
              leftIcon={<Megaphone size={16} />}
            >
              Post Campaign Brief
            </Button>
          </div>
        )}
      </Card>

      {/* SECTION TABS */}
      <div className={styles.tabNav}>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`${styles.tabButton} ${activeTab === 'marketplace' ? styles.tabButtonActive : ''}`}
        >
          <Briefcase size={16} />
          <span>Collab Marketplace</span>
        </button>

        {user && (
          <>
            <button
              onClick={() => setActiveTab('my_collabs')}
              className={`${styles.tabButton} ${activeTab === 'my_collabs' ? styles.tabButtonActive : ''}`}
            >
              <Users size={16} />
              <span>My Pitches & Collabs ({myCollabs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('brand_manager')}
              className={`${styles.tabButton} ${activeTab === 'brand_manager' ? styles.tabButtonActive : ''}`}
            >
              <Building2 size={16} />
              <span>Brand Manager</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: COLLAB MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div>
          {/* Category Filter Pills */}
          <div className={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`${styles.categoryChip} ${selectedCategory === cat ? styles.categoryChipActive : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Campaign Cards Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spinner size="lg" />
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={40} />}
              title="No Campaigns Available"
              description={`No campaigns found in category "${selectedCategory}". Check back soon or post a new brief!`}
            />
          ) : (
            <div className={styles.campaignGrid}>
              {campaigns.map((camp) => (
                <Card key={camp.campaign_id} variant="default" className={styles.campaignCard} style={{ padding: 'var(--space-5)' }}>
                  <div>
                    <div className={styles.campaignHeader}>
                      <span className={styles.companyName}>
                        <Building2 size={14} /> {camp.company_name}
                      </span>
                      <Badge variant="sage" size="sm">
                        {camp.budget_perk}
                      </Badge>
                    </div>

                    <h3 className={styles.campaignTitle}>{camp.title}</h3>
                    <p className={styles.campaignDesc}>{camp.description}</p>

                    {camp.requirements && camp.requirements.length > 0 && (
                      <div className={styles.requirementsBlock}>
                        <div className={styles.requirementsTitle}>Deliverables:</div>
                        <ul className={styles.requirementsList}>
                          {camp.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className={styles.campaignFooter}>
                    <div className={styles.campaignMeta}>
                      <span>{camp.applications_count || 0} applicants</span>
                      <span>Target: {camp.target_creators_count} creators</span>
                    </div>

                    {user ? (
                      <Button
                        variant="primary"
                        size="sm"
                        style={{ width: '100%' }}
                        onClick={() => setApplyCampaign(camp)}
                        leftIcon={<Send size={14} />}
                      >
                        Apply to Collab
                      </Button>
                    ) : (
                      <Link href="/login" style={{ width: '100%' }}>
                        <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                          Log in to Pitch
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY COLLABS */}
      {activeTab === 'my_collabs' && (
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>
            Your Submitted Collaboration Pitches
          </h2>
          {myCollabs.length > 0 ? (
            <div className={styles.applicationList}>
              {myCollabs.map((collab) => (
                <Card key={collab.application_id} variant="default" className={styles.applicationCard} style={{ padding: 'var(--space-5)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                        Campaign ID: {collab.campaign_id}
                      </span>
                      <Badge
                        variant={
                          collab.status === 'accepted'
                            ? 'moss'
                            : collab.status === 'shortlisted'
                            ? 'sage'
                            : 'default'
                        }
                        size="sm"
                      >
                        {collab.status}
                      </Badge>
                    </div>

                    <p className={styles.applicationPitch}>
                      &ldquo;{collab.pitch}&rdquo;
                    </p>

                    <div className={styles.applicationMeta}>
                      <span>Submitted: {new Date(collab.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className={collab.brand_safety?.is_brand_safe ? styles.brandSafetySafe : styles.brandSafetyRisk}>
                        Brand Safety Score: {collab.brand_safety?.score || 100}/100
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Briefcase size={40} />}
              title="No Pitches Yet"
              description="You haven't pitched to any campaigns yet. Discover brands and submit creative pitches."
              actionLabel="Browse Marketplace"
              onAction={() => setActiveTab('marketplace')}
            />
          )}
        </div>
      )}

      {/* TAB 3: BRAND MANAGER (FOR BRAND OWNERS) */}
      {activeTab === 'brand_manager' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Your Brand Campaigns & Applicants
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewCampaignModal(true)}
              leftIcon={<Megaphone size={14} />}
            >
              New Campaign Brief
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {campaigns
              .filter((c) => c.business_id === businessProfile?.business_id)
              .map((camp) => (
                <Card key={camp.campaign_id} variant="default" className={styles.applicationCard} style={{ padding: 'var(--space-5)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
                      {camp.title}
                    </h3>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                      Budget: <strong>{camp.budget_perk}</strong> · Applicants: <strong>{camp.applications_count || 0}</strong>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewApplications(camp)}
                  >
                    Review Applicants ({camp.applications_count || 0})
                  </Button>
                </Card>
              ))}

            {campaigns.filter((c) => c.business_id === businessProfile?.business_id).length === 0 && (
              <EmptyState
                icon={<Megaphone size={40} />}
                title="No Campaigns Posted"
                description="Publish a campaign brief to recruit creators and manage submissions."
                actionLabel="Post Campaign Brief"
                onAction={() => setShowNewCampaignModal(true)}
              />
            )}
          </div>

          {/* Application Review Drawer / Section */}
          {viewCampaignApps && (
            <Card variant="raised" className={styles.drawerContainer} style={{ padding: 'var(--space-6)' }}>
              <div className={styles.drawerHeader}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Applicants for: &ldquo;{viewCampaignApps.title}&rdquo;
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewCampaignApps(null)}
                >
                  ✕ Close
                </Button>
              </div>

              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spinner size="md" />
                </div>
              ) : campaignApps.length > 0 ? (
                <div className={styles.applicationList}>
                  {campaignApps.map((app) => (
                    <Card key={app.application_id} variant="default" className={styles.applicationCard} style={{ padding: 'var(--space-4)' }}>
                      <div>
                        <div className={styles.applicationCreator}>
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                            {app.creator_name}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                            @{app.creator_handle}
                          </span>
                          <Badge
                            variant={app.brand_safety?.is_brand_safe ? 'moss' : 'danger'}
                            size="sm"
                          >
                            Safety: {app.brand_safety?.score || 100}/100
                          </Badge>
                        </div>
                        <p className={styles.applicationPitch}>
                          &ldquo;{app.pitch}&rdquo;
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleStatusUpdate(app.application_id, 'shortlisted')}
                        >
                          Shortlist
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusUpdate(app.application_id, 'accepted')}
                          leftIcon={<Check size={14} />}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleStatusUpdate(app.application_id, 'rejected')}
                          leftIcon={<X size={14} />}
                        >
                          Decline
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)' }}>
                  No applications received for this campaign yet.
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* APPLY TO CAMPAIGN MODAL */}
      <Modal
        isOpen={Boolean(applyCampaign)}
        onClose={() => setApplyCampaign(null)}
        title={applyCampaign ? `Pitch for: ${applyCampaign.title}` : ''}
        size="md"
      >
        <form onSubmit={handleApplyToCampaign} className={styles.formGrid}>
          <FormField label="Your Pitch to Brand" required hint="Describe your creative concept and why you're a great fit">
            <Textarea
              required
              minLength={10}
              placeholder="Describe your concept for this reel..."
              value={applyPitch}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApplyPitch(e.target.value)}
              rows={4}
            />
          </FormField>

          <FormField label="Portfolio Reel ID / Link (Optional)">
            <Input
              type="text"
              placeholder="e.g. vid_your_best_tech_reel"
              value={applyPortfolioId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplyPortfolioId(e.target.value)}
            />
          </FormField>

          <div className={styles.modalFooter}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApplyCampaign(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={applySubmitting}
              leftIcon={<Send size={14} />}
            >
              Submit Collab Pitch
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE CAMPAIGN BRIEF MODAL */}
      <Modal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
        title="Post a Campaign Brief 📢"
        size="lg"
      >
        <form onSubmit={handleCreateCampaign} className={styles.formGrid}>
          <FormField label="Campaign Title" required>
            <Input
              type="text"
              required
              placeholder="e.g. Wireless Noise-Cancelling Earbuds Showcase"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
            />
          </FormField>

          <FormField label="Category Niche" required>
            <Select
              value={newCategory}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCategory(e.target.value)}
              options={[
                { value: 'tech', label: 'Technology & AI' },
                { value: 'lifestyle', label: 'Lifestyle & Fashion' },
                { value: 'fitness', label: 'Health & Fitness' },
                { value: 'gaming', label: 'Gaming' },
                { value: 'comedy', label: 'Comedy & Entertainment' },
                { value: 'music', label: 'Music & Beats' },
              ]}
            />
          </FormField>

          <FormField label="Budget / Creator Perk" required>
            <Input
              type="text"
              required
              placeholder="e.g. $800 + Free Product Sample or ₹30,000 INR"
              value={newBudget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBudget(e.target.value)}
            />
          </FormField>

          <FormField label="Target Number of Creators">
            <Input
              type="number"
              min={1}
              max={50}
              value={newTargetCreators}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTargetCreators(Number(e.target.value))}
            />
          </FormField>

          <FormField label="Campaign Brief & Deliverables" required>
            <Textarea
              required
              minLength={10}
              placeholder="Describe what kind of short video content you seek..."
              value={newDesc}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDesc(e.target.value)}
              rows={3}
            />
          </FormField>

          <FormField label="Specific Requirements (one per line)">
            <Textarea
              placeholder="Must be vertical 9:16 format&#10;Tag #BrandName in caption&#10;Video length between 30-45s"
              value={newRequirements}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewRequirements(e.target.value)}
              rows={3}
            />
          </FormField>

          <FormField label="Application Deadline" required>
            <Input
              type="date"
              required
              value={newDeadline}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDeadline(e.target.value)}
            />
          </FormField>

          <div className={styles.modalFooter}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewCampaignModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createCampaignLoading}
              leftIcon={<Megaphone size={14} />}
            >
              Publish Brief
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
