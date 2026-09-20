'use client';

/**
 * VidSnap.AI Reel Studio 2.0
 * Dual Creation Mode:
 *   Mode A: AI Reel Generator (Images + Script -> Edge-TTS + FFmpeg 720p)
 *   Mode B: Native Video Pipeline (Direct Video Upload + 720p Transcode + AI Hashtags + Drafts/Scheduling)
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  UploadCloud, 
  Image as ImageIcon, 
  Film, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  Clock, 
  Coins, 
  Loader2, 
  Download, 
  Share2, 
  RotateCcw,
  LogIn,
  Video,
  Hash,
  Eye,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';
import { ReelJob, VoiceOption, VideoContent } from '../../lib/types';
import { EngagementBar } from '../../components/EngagementBar';

const VOICES: VoiceOption[] = [
  { id: 'en-US-AriaNeural', name: 'Aria', accent: 'US Natural', gender: 'Female', lang: 'English' },
  { id: 'en-US-GuyNeural', name: 'Guy', accent: 'US Natural', gender: 'Male', lang: 'English' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', accent: 'Indian Accent', gender: 'Female', lang: 'English' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', accent: 'Indian Accent', gender: 'Male', lang: 'English' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', accent: 'British Accent', gender: 'Female', lang: 'English' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara', accent: 'Hindi Accent', gender: 'Female', lang: 'Hindi' },
];

const SCRIPT_INSPIRERS = [
  { label: '🔥 Hook Idea', text: 'Here is the one secret that top creators never tell you about growing an audience...' },
  { label: '🌍 Story Fact', text: 'Did you know that 90% of the world\'s data was created in just the last two years?' },
  { label: '🚀 Motivational', text: 'Success isn\'t about never failing. It\'s about showing up every single day with relentless focus.' },
  { label: '✨ Travel Wonder', text: 'Three hidden natural wonders on Earth that look like they belong on another planet.' },
];

export default function CreateReelPage() {
  const { user, loading: authLoading, updateTokenBalance, refreshUser } = useAuth();
  const { success, error: toastError, info } = useToast();

  // Mode Selection: 'generator' (Images+TTS) vs 'native_video' (Direct Video)
  const [studioMode, setStudioMode] = useState<'generator' | 'native_video'>('generator');

  // MODE A: Image + Script State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [duration, setDuration] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ReelJob | null>(null);

  // MODE B: Native Video Pipeline State
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [nativeVideoFile, setNativeVideoFile] = useState<File | null>(null);
  const [nativeVideoPreview, setNativeVideoPreview] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoHashtags, setVideoHashtags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [generatingTags, setGeneratingTags] = useState(false);
  const [uploadingNative, setUploadingNative] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string>('');
  const [publishedVideo, setPublishedVideo] = useState<VideoContent | null>(null);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      if (nativeVideoPreview) URL.revokeObjectURL(nativeVideoPreview);
    };
  }, [previewUrls, nativeVideoPreview]);

  // Polling loop for active generator job
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
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          } catch {
            // Non-fatal
          }
          success('Your AI Reel has been rendered successfully!');
          refreshUser();
        } else if (job.status === 'failed') {
          clearInterval(interval);
          toastError(job.error_msg || 'Reel generation encountered an error.');
          refreshUser();
        }
      } catch {
        // Polling retry
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeJobId, refreshUser, success, toastError]);

  // Handle Mode A Image files
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const combined = [...selectedFiles, ...newFiles].slice(0, 5);
    if (combined.length > 5) info('Maximum 5 images allowed per reel.');
    setSelectedFiles(combined);
    setPreviewUrls(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setPreviewUrls(updated.map((f) => URL.createObjectURL(f)));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedFiles.length) return;
    const updated = [...selectedFiles];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSelectedFiles(updated);
    setPreviewUrls(updated.map((f) => URL.createObjectURL(f)));
  };

  // Submit Mode A Reel Job
  const handleGenerateReel = async () => {
    if (selectedFiles.length === 0) {
      toastError('Please upload at least 1 image.');
      return;
    }
    if (!voiceoverText.trim()) {
      toastError('Please enter a voiceover script.');
      return;
    }
    if ((user?.tokens_remaining ?? 0) < 1) {
      toastError('No creation tokens remaining.');
      return;
    }

    setSubmitting(true);
    setJobStatus(null);
    try {
      const formData = new FormData();
      formData.append('voiceover_text', voiceoverText);
      formData.append('voice', selectedVoice);
      formData.append('duration', String(duration));
      selectedFiles.forEach((f) => formData.append('images', f));

      const resp = await api.reelStudio.createJobMultipart(formData);
      setActiveJobId(resp.job_id);
      setJobStatus({ job_id: resp.job_id, status: 'queued', progress_stage: 'queued' });
      if (user) updateTokenBalance(user.tokens_remaining - 1);
      success('Job enqueued! FFmpeg rendering started in the background.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch job';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mode B Native Video Selection
  const handleVideoFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      toastError('Video file exceeds the 50MB free-tier limit.');
      return;
    }
    setNativeVideoFile(file);
    setNativeVideoPreview(URL.createObjectURL(file));
    if (!videoTitle) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setVideoTitle(baseName);
    }
  };

  // Mode B: AI Hashtag Suggestion
  const handleSuggestTags = async () => {
    if (!videoTitle.trim()) {
      toastError('Please enter a video title first.');
      return;
    }
    setGeneratingTags(true);
    try {
      const res = await api.content.suggestTags(videoTitle, videoDescription);
      setVideoHashtags(res.hashtags.join(', '));
      success('AI generated hashtags added!');
    } catch {
      toastError('Failed to generate tags.');
    } finally {
      setGeneratingTags(false);
    }
  };

  // Submit Mode B Native Video with direct R2 upload and fallback
  const handleUploadNativeVideo = async (isDraft: boolean = false) => {
    if (!nativeVideoFile) {
      toastError('Please select a video file.');
      return;
    }
    if (!videoTitle.trim()) {
      toastError('Please enter a video title.');
      return;
    }

    setUploadingNative(true);
    setUploadProgress(0);
    setUploadPhase('Preparing upload...');

    try {
      const parsedTags = videoHashtags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const scheduledIso = isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : undefined;

      let res: VideoContent | null = null;

      // Step 1: Attempt browser-direct signed upload to Cloudinary / Object Storage
      try {
        setUploadPhase('Requesting direct edge upload URL...');
        const presigned = await api.media.getVideoUploadUrl({
          filename: nativeVideoFile.name,
          content_type: nativeVideoFile.type || 'video/mp4',
          size_bytes: nativeVideoFile.size,
        });

        if (presigned?.upload_url && presigned?.key) {
          setUploadPhase('Uploading directly to edge storage...');
          await api.media.uploadToPresigned(
            presigned.upload_url,
            nativeVideoFile,
            nativeVideoFile.type || 'video/mp4',
            (percent) => {
              setUploadProgress(percent);
            },
            presigned.method || 'PUT',
            presigned.fields
          );

          setUploadPhase('Registering video post...');
          res = await api.content.createVideoFromKey({
            key: presigned.key,
            title: videoTitle,
            description: videoDescription,
            hashtags: parsedTags,
            visibility: visibility as any,
            scheduled_at: scheduledIso,
            is_draft: isDraft,
          });
        }
      } catch (directErr) {
        console.warn('Direct edge upload failed or unsupported; falling back to multipart upload:', directErr);
      }

      // Step 2: Fallback to standard multipart upload if direct-to-R2 was not completed
      if (!res) {
        setUploadPhase('Uploading via backend stream...');
        const formData = new FormData();
        formData.append('video', nativeVideoFile);
        formData.append('title', videoTitle);
        formData.append('description', videoDescription);
        formData.append('hashtags', videoHashtags);
        formData.append('visibility', visibility);
        formData.append('is_draft', String(isDraft));
        if (scheduledIso) {
          formData.append('scheduled_at', scheduledIso);
        }
        res = await api.content.uploadNativeVideo(formData);
      }

      setPublishedVideo(res);
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Non-fatal
      }
      success(isDraft ? 'Draft saved successfully!' : 'Video uploaded! Enqueued for 720p vertical transcoding.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toastError(msg);
    } finally {
      setUploadingNative(false);
      setUploadProgress(null);
      setUploadPhase('');
    }
  };

  // Auth gate check
  if (!authLoading && !user) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px' }}>
          <Sparkles size={36} color="var(--primary-light)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '10px' }}>Sign In to Create Reels</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Access the AI Reel Generator and Native Video Transcoder with 5 free credits.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-secondary"><LogIn size={16} /><span>Sign In</span></Link>
            <Link href="/register" className="btn btn-primary"><span>Sign Up (5 Tokens)</span></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Studio Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={26} color="var(--primary-light)" />
            <span>AI Reel Studio 2.0</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Choose between AI Reel Generation (Photos + Script) or Native Video 720p Processing.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--glass-border)',
        }}>
          <button
            onClick={() => setStudioMode('generator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: studioMode === 'generator' ? '#fff' : 'var(--text-secondary)',
              background: studioMode === 'generator' ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ImageIcon size={15} />
            <span>AI Images + Script</span>
          </button>

          <button
            onClick={() => setStudioMode('native_video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: studioMode === 'native_video' ? '#fff' : 'var(--text-secondary)',
              background: studioMode === 'native_video' ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Video size={15} />
            <span>Upload Native Video</span>
          </button>
        </div>
      </div>

      {/* ======================================================================
          MODE A: AI REEL GENERATOR (Photos + Script)
          ====================================================================== */}
      {studioMode === 'generator' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeJobId ? '1fr 380px' : '1fr',
          gap: '32px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Images */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={20} color="var(--accent-cyan)" />
                  <span>1. Select Images (1 to 5)</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedFiles.length}/5 Selected</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                style={{
                  border: '2px dashed var(--glass-border-hover)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <UploadCloud size={36} color="var(--primary-light)" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ fontWeight: 600, fontSize: '0.925rem', marginBottom: '2px' }}>
                  Drag & drop photos here, or click to browse
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Supports JPEG, PNG, WebP</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
              </div>

              {previewUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '16px' }}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '9/16', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Slide ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Script */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={20} color="var(--primary-light)" />
                  <span>2. Voiceover Script</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: voiceoverText.length > 900 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                  {voiceoverText.length} / 900
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {SCRIPT_INSPIRERS.map((chip, idx) => (
                  <button key={idx} type="button" onClick={() => setVoiceoverText(chip.text)} style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {chip.label}
                  </button>
                ))}
              </div>

              <textarea className="form-textarea" placeholder="Enter narration script for your reel..." maxLength={900} rows={4} value={voiceoverText} onChange={(e) => setVoiceoverText(e.target.value)} />
            </div>

            {/* 3. Settings & Launch */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={20} color="var(--accent-emerald)" />
                <span>3. Voice Talent & Timing</span>
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label">Voice</label>
                  <select className="form-select" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id} style={{ background: '#0e131f' }}>{v.name} ({v.accent})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Seconds per Slide ({duration}s)</label>
                  <input type="range" min={1} max={10} step={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>
              </div>

              <button onClick={handleGenerateReel} disabled={submitting || selectedFiles.length === 0 || !voiceoverText.trim()} className="btn btn-primary btn-lg" style={{ width: '100%', padding: '14px' }}>
                {submitting ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                <span>Render AI Reel (Costs 1 Token)</span>
              </button>
            </div>
          </div>

          {/* Live Progress or Player Column */}
          {activeJobId && (
            <div className="glass-card" style={{ position: 'sticky', top: '88px', textAlign: 'center', padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
                {jobStatus?.status === 'completed' ? '🎉 Reel Rendered!' : 'Encoding Reel...'}
              </h3>

              {jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed' && (
                <div style={{ padding: '20px 0' }}>
                  <Loader2 size={36} color="var(--primary-light)" style={{ animation: 'spinSlow 2s linear infinite', margin: '0 auto 16px auto' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Stage: {jobStatus?.progress_stage || 'Processing'}</div>
                </div>
              )}

              {jobStatus?.status === 'completed' && jobStatus.reel_url && (
                <div>
                  <div className="reel-aspect-container" style={{ width: '100%', maxWidth: '280px', margin: '0 auto 16px auto' }}>
                    <video src={jobStatus.reel_url} controls autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <a href={jobStatus.reel_url} download="reel.mp4" className="btn btn-primary" style={{ width: '100%', marginBottom: '8px' }}>
                    <Download size={16} /><span>Download MP4</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          MODE B: NATIVE VIDEO PIPELINE (Direct Video Upload + Transcoding)
          ====================================================================== */}
      {studioMode === 'native_video' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: nativeVideoFile ? '1.2fr 0.8fr' : '1fr',
          gap: '32px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Video File Dropzone */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Video size={20} color="var(--accent-cyan)" />
                <span>1. Upload Video File</span>
              </h2>

              <div
                onClick={() => videoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleVideoFile(e.dataTransfer.files); }}
                style={{
                  border: '2px dashed var(--glass-border-hover)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <Video size={40} color="var(--accent-cyan)" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {nativeVideoFile ? nativeVideoFile.name : 'Drag & drop a video file here, or browse'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Supports MP4, WebM, MOV (Max 50MB, up to 60 seconds)
                </p>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} onChange={(e) => handleVideoFile(e.target.files)} />
              </div>
            </div>

            {/* Video Details Form */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Film size={20} color="var(--primary-light)" />
                <span>2. Video Metadata & Discovery</span>
              </h2>

              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" required placeholder="Punchy title for your reel..." className="form-input" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea className="form-textarea" rows={3} placeholder="Tell viewers what happens in this clip..." value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} />
              </div>

              {/* AI Hashtags Generator */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label">Hashtags</label>
                  <button type="button" onClick={handleSuggestTags} disabled={generatingTags || !videoTitle.trim()} style={{ fontSize: '0.78rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={13} />
                    <span>{generatingTags ? 'Generating...' : 'AI Suggest Tags'}</span>
                  </button>
                </div>
                <input type="text" placeholder="#Trending, #Viral, #Tech..." className="form-input" value={videoHashtags} onChange={(e) => setVideoHashtags(e.target.value)} />
              </div>

              {/* Visibility & Scheduling */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label className="form-label">Visibility</label>
                  <select className="form-select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="public" style={{ background: '#0e131f' }}>Public</option>
                    <option value="unlisted" style={{ background: '#0e131f' }}>Unlisted</option>
                    <option value="private" style={{ background: '#0e131f' }}>Private</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <input id="schedToggle" type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor="schedToggle" className="form-label" style={{ cursor: 'pointer', margin: 0 }}>Schedule Release</label>
                  </div>
                  {isScheduled && (
                    <input type="datetime-local" className="form-input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                  )}
                </div>
              </div>

              {/* Direct Upload Progress Indicator */}
              {uploadingNative && (
                <div style={{ marginTop: '20px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={13} className="spin" />
                      <span>{uploadPhase || 'Uploading...'}</span>
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {uploadProgress !== null ? `${uploadProgress}%` : ''}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${uploadProgress ?? 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary), var(--accent-cyan))',
                      transition: 'width 0.2s ease',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => handleUploadNativeVideo(true)}
                  disabled={uploadingNative || !nativeVideoFile}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <Save size={16} />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUploadNativeVideo(false)}
                  disabled={uploadingNative || !nativeVideoFile || !videoTitle.trim()}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                >
                  {uploadingNative ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                  <span>{isScheduled ? 'Schedule Video' : 'Publish to 720p Reel'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Native Video Preview Column */}
          {nativeVideoPreview && (
            <div className="glass-card" style={{ position: 'sticky', top: '88px', textAlign: 'center', padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>Video Preview</h3>
              <div className="reel-aspect-container" style={{ width: '100%', maxWidth: '280px', margin: '0 auto 16px auto' }}>
                <video src={nativeVideoPreview} controls autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {publishedVideo && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, justifyContent: 'center', marginBottom: '12px' }}>
                    <CheckCircle2 size={16} />
                    <span>Transcoding Enqueued!</span>
                  </div>
                  <EngagementBar videoId={publishedVideo.video_id} videoUrl={publishedVideo.video_url} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
