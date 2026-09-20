'use client';

/**
 * VidSnap.AI User Feedback Page
 * Star ratings, category selectors, and direct API submission.
 */

import React, { useState } from 'react';
import { MessageSquare, Star, Send, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';

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
    <div className="container-narrow" style={{ paddingBottom: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 4px 16px var(--primary-glow)',
        }}>
          <MessageSquare size={26} color="#fff" />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Share Your Feedback</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto' }}>
          Tell us about your reel creation experience, report issues, or request new AI features.
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: '580px', margin: '0 auto', padding: '36px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-emerald)',
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Feedback Received!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
              We review every comment to continuously improve our video engine and free-tier infrastructure.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setMessage('');
              }}
              className="btn btn-secondary"
            >
              Send Another Note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>
                How would you rate your experience?
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ padding: '4px', cursor: 'pointer', transition: 'transform 0.1s' }}
                  >
                    <Star
                      size={28}
                      color={(hoverRating || rating) >= star ? '#fbbf24' : 'var(--text-muted)'}
                      fill={(hoverRating || rating) >= star ? '#fbbf24' : 'transparent'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div className="form-group">
              <label className="form-label">Feedback Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: category === cat ? 'rgba(99, 102, 241, 0.2)' : 'var(--glass-bg)',
                      border: `1px solid ${category === cat ? 'var(--primary-light)' : 'var(--glass-border)'}`,
                      color: category === cat ? 'var(--primary-light)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Your Message</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="What did you like? What went wrong? What features should we add next?..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {user && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Submitting as: <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {submitting ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
