'use client';

/**
 * VidSnap.AI Login & Password Reset Page
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, KeyRound, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  Card,
  Button,
  Input,
  FormField,
  Modal,
} from '@/components/ui';
import styles from './auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await login(email, password);
      success('Welcome back to VidSnap.AI!');
      router.push('/create');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setFormError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    try {
      await api.auth.forgotPassword(resetEmail);
      setOtpSent(true);
      success('6-digit OTP sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      toastError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    try {
      await api.auth.resetPassword(resetEmail, resetOtp, newPassword);
      success('Password successfully reset! You can now log in.');
      setShowForgotModal(false);
      setOtpSent(false);
      setPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      toastError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card variant="raised" className={styles.authCard}>
        {/* Header */}
        <div className={styles.authHeader}>
          <div className={styles.headerIcon}>
            <LogIn size={24} />
          </div>
          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>
            Sign in to access your Reel Studio and credits
          </p>
        </div>

        {formError && (
          <div className={styles.errorMessage} role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.formGrid}>
          <FormField label="Email Address" required>
            <Input
              id="email"
              type="email"
              required
              placeholder="creator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
          </FormField>

          <div>
            <div className={styles.passwordHeader}>
              <label htmlFor="password" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                Password *
              </label>
              <button
                type="button"
                className={styles.forgotBtn}
                onClick={() => { setShowForgotModal(true); setResetEmail(email); }}
              >
                Forgot Password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            style={{ width: '100%', marginTop: 'var(--space-2)', padding: 'var(--space-3)' }}
          >
            Sign In
          </Button>
        </form>

        <div className={styles.cardFooter}>
          Don&apos;t have an account?
          <Link href="/register" className={styles.authLink}>
            Sign Up (Get 5 Free Credits)
          </Link>
        </div>
      </Card>

      {/* Forgot Password OTP Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        description={otpSent ? 'Enter the 6-digit OTP code sent to your email.' : 'Enter your registered email to receive an OTP code.'}
        size="sm"
      >
        {!otpSent ? (
          <form onSubmit={handleSendOtp} className={styles.formGrid}>
            <FormField label="Email Address" required>
              <Input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                leftIcon={<Mail size={16} />}
              />
            </FormField>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForgotModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={resetSubmitting}
              >
                Send OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className={styles.formGrid}>
            <FormField label="6-Digit OTP Code" required>
              <Input
                type="text"
                required
                maxLength={6}
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value)}
                placeholder="123456"
                className={styles.otpInput}
              />
            </FormField>

            <FormField label="New Password" required hint="At least 8 characters">
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
              />
            </FormField>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForgotModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={resetSubmitting}
              >
                Set Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
