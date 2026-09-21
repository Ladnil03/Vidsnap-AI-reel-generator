'use client';

/**
 * VidSnap.AI User Feedback Page
 * Star ratings, category selectors, and direct API submission.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useState } from 'react';
import { MessageSquare, Star, Send, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Badge,
  Textarea,
  FormField,
  useToast,
} from '@/components/ui';

const CATEGORIES = [
  '✨ Feature Idea',
  '🐛 Bug Report',
  '🎨 UI / Visual Polish',
  '⚡ Performance & Speed',
  '💬 General Thoughts',
];

export default function FeedbackPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      toastError('Please write at least a short sentence for your feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const fullMessage = `[Category: ${category}] [Rating: ${rating}/5 stars]\n${message}`;
      await api.feedback.submit(fullMessage);
      setSubmitted(true);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {
        // Non-fatal
      }
      success('Thank you! Your feedback has been sent to our team.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send feedback';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--space-8) var(--space-4) var(--space-16) var(--space-4)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-forest-800)',
            color: 'var(--color-cream-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <MessageSquare size={26} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
          Share Your Feedback
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
          Tell us about your reel creation experience, report issues, or request new AI features.
        </p>
      </div>

      <Card variant="raised" style={{ padding: 'var(--space-8)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4) auto',
                color: 'var(--success)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
              Feedback Received!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              We review every comment to continuously improve our video engine and free-tier infrastructure.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setRating(5);
              }}
            >
              Send Another Note
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Rating Stars */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                How is your VidSnap.AI experience?
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: (hoverRating || rating) >= star ? 'var(--warning)' : 'var(--border-subtle)',
                      transition: 'transform var(--motion-duration-fast) var(--motion-ease)',
                    }}
                  >
                    <Star size={28} fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                Topic Category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${category === cat ? 'var(--color-forest-800)' : 'var(--border-subtle)'}`,
                      background: category === cat ? 'var(--color-forest-800)' : 'var(--bg-sunken)',
                      color: category === cat ? 'var(--color-cream-100)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: category === cat ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all var(--motion-duration-fast) var(--motion-ease)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <FormField label="Your Message / Request" required>
              <Textarea
                rows={4}
                required
                placeholder="What did you create today? What can we improve?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={submitting || message.trim().length < 5}
              leftIcon={<Send size={16} />}
              style={{ justifyContent: 'center' }}
            >
              Submit Feedback
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
