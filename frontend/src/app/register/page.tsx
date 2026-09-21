'use client';

/**
 * VidSnap.AI Registration Page
 * Features real-time password strength meter and 5-token gift banner.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Check, AlertCircle, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  Card,
  Button,
  Input,
  FormField,
  Checkbox,
} from '@/components/ui';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!hasMinLength || !hasNumber || !hasLetter) {
      setFormError('Password must be at least 8 characters and include letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setFormError('Please agree to the Terms of Service.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(name, email, password);
      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti non-fatal
      }
      success('Account created! 5 free creation tokens have been credited.');
      router.push('/create');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card variant="raised" className={styles.authCard}>
        {/* Token Gift Banner */}
        <div className={styles.tokenBanner}>
          <Coins size={18} />
          <span>Special Welcome: 5 Free AI Generation Credits</span>
        </div>

        {/* Header */}
        <div className={styles.authHeader}>
          <div className={styles.headerIcon}>
            <UserPlus size={24} />
          </div>
          <h1 className={styles.authTitle}>Create Your Account</h1>
          <p className={styles.authSubtitle}>
            Start creating viral AI reels in seconds
          </p>
        </div>

        {formError && (
          <div className={styles.errorMessage} role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className={styles.formGrid}>
          <FormField label="Full Name" required>
            <Input
              id="name"
              type="text"
              required
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User size={16} />}
            />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              id="email"
              type="email"
              required
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
          </FormField>

          <FormField label="Password" required hint="Min 8 chars with letters & numbers">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
            />

            {/* Live requirements checklist */}
            <div className={styles.requirementsRow}>
              <span className={`${styles.requirementItem} ${hasMinLength ? styles.requirementMet : styles.requirementUnmet}`}>
                <Check size={12} /> 8+ chars
              </span>
              <span className={`${styles.requirementItem} ${hasLetter ? styles.requirementMet : styles.requirementUnmet}`}>
                <Check size={12} /> Letters
              </span>
              <span className={`${styles.requirementItem} ${hasNumber ? styles.requirementMet : styles.requirementUnmet}`}>
                <Check size={12} /> Numbers
              </span>
            </div>
          </FormField>

          <FormField label="Confirm Password" required>
            <Input
              id="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              error={confirmPassword.length > 0 && !passwordsMatch}
            />
          </FormField>

          <div className={styles.termsRow}>
            <Checkbox
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              label="I agree to the Terms of Service & Privacy Policy"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            style={{ width: '100%', marginTop: 'var(--space-2)', padding: 'var(--space-3)' }}
          >
            Sign Up (Get 5 Free Credits)
          </Button>
        </form>

        <div className={styles.cardFooter}>
          Already have an account?
          <Link href="/login" className={styles.authLink}>
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
