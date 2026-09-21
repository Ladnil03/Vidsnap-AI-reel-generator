'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  UploadCloud,
  Film,
  X,
  Clock,
  Coins,
  Download,
  Share2,
  Video,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { ReelJob, JobStatusType, VoiceOption, VideoContent } from '../../lib/types';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Input,
  Textarea,
  Select,
  FormField,
  Tabs,
  TabPanel,
  ProgressBar,
  Spinner,
  PageHeader,
  EmptyState,
} from '@/components/ui';

const VOICES: VoiceOption[] = [
  { id: 'en-US-AriaNeural', name: 'Aria', accent: 'US Natural', gender: 'Female', lang: 'English' },
  { id: 'en-US-GuyNeural', name: 'Guy', accent: 'US Natural', gender: 'Male', lang: 'English' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', accent: 'Indian Accent', gender: 'Female', lang: 'English' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', accent: 'Indian Accent', gender: 'Male', lang: 'English' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara', accent: 'Hindi Accent', gender: 'Female', lang: 'Hindi' },
];

const SCRIPT_INSPIRERS = [
  { label: '🌿 Nature Hook', text: 'Deep in the heart of the ancient canopy, hidden life begins at sunrise...' },
  { label: '💡 Tech Fact', text: 'Artificial intelligence is fundamentally changing how creators produce media in 2026...' },
  { label: '🚀 Creator Motivation', text: 'You do not need an expensive studio to make an impact. All you need is a story.' },
];

export default function CreateReelPage() {
  const { user, updateTokenBalance, refreshUser } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState('generator');

  // MODE A: Generator
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [duration, setDuration] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ReelJob | null>(null);

  // MODE B: Native Video
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [nativeVideoFile, setNativeVideoFile] = useState<File | null>(null);
  const [nativeVideoPreview, setNativeVideoPreview] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoHashtags, setVideoHashtags] = useState('');
  const [uploadingNative, setUploadingNative] = useState(false);
  const [publishedVideo, setPublishedVideo] = useState<VideoContent | null>(null);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      if (nativeVideoPreview) URL.revokeObjectURL(nativeVideoPreview);
    };
  }, [previewUrls, nativeVideoPreview]);

  // Polling loop for active job
  useEffect(() => {
    if (!activeJobId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const job = await api.reelStudio.getJobStatus(activeJobId);
        if (!isSubscribed) return;

        setJobStatus(job);

        if (job.status === 'completed') {
          clearInterval(interval);
          try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          } catch {
            // Non-fatal
          }
          success('Your AI Reel has been rendered successfully in 720p!');
          setSubmitting(false);
          refreshUser?.();
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setSubmitting(false);
          toastError(job.error_msg || 'Generation failed. Your token credit has been automatically refunded.');
          refreshUser?.();
        }
      } catch {
        // Continue polling
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeJobId, refreshUser, success, toastError]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const combined = [...selectedFiles, ...newFiles].slice(0, 5);

    setSelectedFiles(combined);
    setPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return combined.map((f) => URL.createObjectURL(f));
    });
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async () => {
    if (!user) {
      info('Please sign in to create reels.');
      return;
    }
    if (selectedFiles.length === 0) {
      toastError('Please upload at least 1 image.');
      return;
    }
    if (!voiceoverText.trim()) {
      toastError('Please enter a voiceover script.');
      return;
    }
    if ((user.tokens_remaining ?? 0) < 1) {
      toastError('Insufficient creation tokens. Earn more via daily streaks!');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('images', file));
      formData.append('voiceover_text', voiceoverText);
      formData.append('voice', selectedVoice);
      formData.append('duration', String(duration));

      const res = await api.reelStudio.createJobMultipart(formData);

      setActiveJobId(res.job_id);
      setJobStatus({
        job_id: res.job_id,
        status: (res.status as JobStatusType) || 'queued',
        progress_stage: 'queued',
        created_at: new Date().toISOString(),
      });
      if (user?.tokens_remaining !== undefined) {
        updateTokenBalance?.(Math.max(0, user.tokens_remaining - 1));
      }
      success('Job queued! Media worker is synthesizing voiceover and rendering video.');
    } catch (err: unknown) {
      setSubmitting(false);
      toastError((err as Error).message || 'Failed to submit creation job.');
    }
  };

  const handleNativeVideoSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      toastError('Please select a valid MP4 or WebM video file.');
      return;
    }
    setNativeVideoFile(file);
    if (nativeVideoPreview) URL.revokeObjectURL(nativeVideoPreview);
    setNativeVideoPreview(URL.createObjectURL(file));
  };

  const handlePublishNative = async () => {
    if (!user) {
      info('Please sign in to publish video.');
      return;
    }
    if (!nativeVideoFile) {
      toastError('Please select a video file.');
      return;
    }
    if (!videoTitle.trim()) {
      toastError('Please enter a video title.');
      return;
    }

    setUploadingNative(true);
    try {
      const formData = new FormData();
      formData.append('title', videoTitle);
      formData.append('video', nativeVideoFile);
      if (videoDescription) formData.append('description', videoDescription);
      if (videoHashtags) formData.append('hashtags', videoHashtags);
      formData.append('visibility', 'public');

      const res = await api.content.uploadNativeVideo(formData);

      setPublishedVideo(res);
      success('Video published successfully to the universal feed!');
    } catch (err: unknown) {
      toastError((err as Error).message || 'Failed to publish video.');
    } finally {
      setUploadingNative(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '960px', paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <PageHeader
        title="AI Reel Studio"
        description="Craft vertical 720p social reels with neural voice synthesis or direct video transcode."
        action={
          user ? (
            <Badge variant="sage" icon={<Coins size={14} />}>
              {user.tokens_remaining ?? 0} Tokens Available
            </Badge>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign in to Create
              </Button>
            </Link>
          )
        }
      />

      {/* Mode Switcher Tabs */}
      <Tabs
        tabs={[
          { id: 'generator', label: 'AI Story Studio (1-5 Photos + Voiceover)', icon: <Sparkles size={16} /> },
          { id: 'native', label: 'Direct Video Upload (720p Transcode)', icon: <Film size={16} /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 'var(--space-6)' }}
      />

      {/* ========================================================================
          MODE A: AI Image + Script Reel Generator
          ======================================================================== */}
      <TabPanel id="generator" activeTab={activeTab}>
        {jobStatus?.status === 'completed' && jobStatus.reel_url ? (
          /* Rendered Result View */
          <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Badge variant="success" icon={<CheckCircle2 size={14} />} style={{ marginBottom: 'var(--space-3)' }}>
              Render Complete
            </Badge>
            <h3 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
              Your Reel is Ready!
            </h3>

            <div
              style={{
                maxWidth: '320px',
                aspectRatio: '9 / 16',
                margin: '0 auto var(--space-6) auto',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                backgroundColor: 'var(--player-bg)',
                border: '1px solid var(--player-border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <video
                src={jobStatus.reel_url}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <a href={jobStatus.reel_url} download="vidsnap-reel.mp4" target="_blank" rel="noreferrer">
                <Button variant="primary" leftIcon={<Download size={16} />}>
                  Download 720p MP4
                </Button>
              </a>
              <Link href="/gallery">
                <Button variant="secondary">View in Gallery</Button>
              </Link>
              <Button
                variant="ghost"
                leftIcon={<RotateCcw size={16} />}
                onClick={() => {
                  setJobStatus(null);
                  setActiveJobId(null);
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                  setVoiceoverText('');
                }}
              >
                Create Another
              </Button>
            </div>
          </Card>
        ) : submitting || (jobStatus && jobStatus.status !== 'completed' && jobStatus.status !== 'failed') ? (
          /* Job Status Timeline */
          <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
            <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
            <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
              Generating Your 720p Reel
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Edge-TTS is synthesizing neural voiceover and FFmpeg media worker is assembling your vertical video.
            </p>

            {/* Timeline Progress Stages */}
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>1. Queued</span>
                <span style={{ color: jobStatus?.progress_stage === 'tts' || jobStatus?.progress_stage === 'rendering' ? 'var(--brand-primary)' : 'inherit' }}>
                  2. Neural Voiceover
                </span>
                <span style={{ color: jobStatus?.progress_stage === 'rendering' ? 'var(--brand-primary)' : 'inherit' }}>
                  3. FFmpeg 720p
                </span>
                <span>4. Complete</span>
              </div>
              <ProgressBar
                value={
                  jobStatus?.progress_stage === 'rendering'
                    ? 75
                    : jobStatus?.progress_stage === 'tts'
                    ? 45
                    : 20
                }
              />
            </div>
          </Card>
        ) : (
          /* Multi-Step Creation Wizard Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Step 1: Upload Images */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                1. Upload Images (1 to 5)
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                High-resolution portrait or landscape photos. FFmpeg will apply intelligent blurred 9:16 background padding.
              </p>

              {/* Drag and drop dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--surface-sunken)',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <UploadCloud size={36} style={{ color: 'var(--brand-primary)', margin: '0 auto var(--space-2) auto' }} />
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-sm)' }}>
                  Drag and drop images here, or click to browse
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  PNG, JPG, or WebP up to 10MB each
                </div>
              </div>

              {/* Thumbnails preview */}
              {previewUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {previewUrls.map((url, i) => (
                    <div
                      key={url}
                      style={{
                        position: 'relative',
                        width: '90px',
                        height: '120px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-medium)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Slide ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: 'var(--cream-50)',
                          backgroundColor: 'var(--scrim-medium)',
                          padding: '1px 4px',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        #{i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="Remove image"
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: 'var(--danger)',
                          color: 'var(--color-cream-100)',
                          borderRadius: 'var(--radius-pill)',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Step 2: Voiceover Script */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)' }}>2. Voiceover Narrative</h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {voiceoverText.length}/900 characters
                </span>
              </div>

              {/* Inspiration Pills */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                {SCRIPT_INSPIRERS.map((insp) => (
                  <button
                    key={insp.label}
                    type="button"
                    onClick={() => setVoiceoverText(insp.text)}
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-paper)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {insp.label}
                  </button>
                ))}
              </div>

              <Textarea
                value={voiceoverText}
                onChange={(e) => setVoiceoverText(e.target.value.slice(0, 900))}
                placeholder="Write an engaging script for your reel. Microsoft Edge-TTS will speak it fluently..."
                rows={4}
              />
            </Card>

            {/* Step 3: Voice and Timing */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
                3. Voice & Timing Configuration
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
                <FormField id="f-voice" label="Neural Voice (Edge-TTS)">
                  <Select
                    id="f-voice"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    options={VOICES.map((v) => ({
                      value: v.id,
                      label: `${v.name} (${v.lang} - ${v.accent}, ${v.gender})`,
                    }))}
                  />
                </FormField>

                <FormField id="f-dur" label={`Slide Duration: ${duration}s / image`}>
                  <input
                    type="range"
                    id="f-dur"
                    min={1}
                    max={8}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                  />
                </FormField>
              </div>
            </Card>

            {/* Generate Trigger */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Sparkles size={18} />}
                onClick={handleGenerate}
                disabled={selectedFiles.length === 0 || !voiceoverText.trim()}
              >
                Generate 720p Reel (Costs 1 Token)
              </Button>
            </div>
          </div>
        )}
      </TabPanel>

      {/* ========================================================================
          MODE B: Direct Video Upload Pipeline
          ======================================================================== */}
      <TabPanel id="native" activeTab={activeTab}>
        {publishedVideo ? (
          <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Badge variant="success" icon={<CheckCircle2 size={14} />} style={{ marginBottom: 'var(--space-3)' }}>
              Published
            </Badge>
            <h3 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
              Video is Live in the Universal Feed!
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <Link href="/feed">
                <Button variant="primary">View in Feed</Button>
              </Link>
              <Button variant="ghost" onClick={() => setPublishedVideo(null)}>
                Upload Another Video
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
              Direct Video Upload
            </h3>

            {/* Video Dropzone */}
            <div
              onClick={() => videoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleNativeVideoSelect(e.dataTransfer.files);
              }}
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-8)',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--surface-sunken)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                style={{ display: 'none' }}
                onChange={(e) => handleNativeVideoSelect(e.target.files)}
              />
              <Video size={36} style={{ color: 'var(--brand-primary)', margin: '0 auto var(--space-2) auto' }} />
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-sm)' }}>
                {nativeVideoFile ? nativeVideoFile.name : 'Select or drop MP4/WebM vertical video'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                720p or 1080p vertical video up to 50MB
              </div>
            </div>

            {/* Metadata Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FormField id="v-title" label="Title" required>
                <Input
                  id="v-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter a catchy title..."
                />
              </FormField>

              <FormField id="v-desc" label="Description">
                <Textarea
                  id="v-desc"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Tell viewers what this reel is about..."
                  rows={3}
                />
              </FormField>

              <FormField id="v-tags" label="Hashtags (comma separated)">
                <Input
                  id="v-tags"
                  value={videoHashtags}
                  onChange={(e) => setVideoHashtags(e.target.value)}
                  placeholder="nature, reels, travel, tech"
                />
              </FormField>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <Button
                  variant="primary"
                  onClick={handlePublishNative}
                  loading={uploadingNative}
                  disabled={!nativeVideoFile || !videoTitle.trim()}
                >
                  Publish Video
                </Button>
              </div>
            </div>
          </Card>
        )}
      </TabPanel>
    </div>
  );
}
