'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Heart, 
  Send, 
  Share2, 
  Check, 
  Film, 
  Sun, 
  Moon, 
  Layers 
} from 'lucide-react';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Avatar,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Radio,
  FormField,
  Tabs,
  TabPanel,
  Modal,
  Sheet,
  useToast,
  Tooltip,
  Skeleton,
  EmptyState,
  ProgressBar,
  ProgressRing,
  Divider,
  PageHeader,
} from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

export default function StyleguidePage() {
  const { theme, toggleTheme } = useTheme();
  const { success, error, warning, info } = useToast();

  const [activeTab, setActiveTab] = useState('buttons');
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [radioSelected, setRadioSelected] = useState('opt1');

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
      <PageHeader
        title="Forest & Paper Design System Styleguide"
        description="Interactive reference showcase of all 22 accessible UI primitives in both Paper (Light) and Forest (Dark) themes."
        action={
          <Button
            variant="secondary"
            leftIcon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            onClick={toggleTheme}
          >
            Switch to {theme === 'dark' ? 'Paper (Light)' : 'Forest (Dark)'}
          </Button>
        }
      />

      {/* Palette Swatches */}
      <Card variant="raised" style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Brand Palette & Contrast Swatches</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          <div style={{ background: 'var(--cream-200)', color: 'var(--forest-900)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <strong>Cream</strong>
            <div>#E5D9B6</div>
            <small>Paper Canvas</small>
          </div>
          <div style={{ background: 'var(--sage-400)', color: 'var(--forest-900)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <strong>Sage</strong>
            <div>#A4BE7B</div>
            <small>Accent & Highlights</small>
          </div>
          <div style={{ background: 'var(--moss-500)', color: '#FFFFFF', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <strong>Moss</strong>
            <div>#5F8D4E</div>
            <small>Mid Fills & Icons</small>
          </div>
          <div style={{ background: 'var(--forest-500)', color: 'var(--cream-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <strong>Forest</strong>
            <div>#285430</div>
            <small>Primary Buttons & Text</small>
          </div>
        </div>
      </Card>

      {/* Category Tabs */}
      <Tabs
        tabs={[
          { id: 'buttons', label: 'Buttons & Icons' },
          { id: 'forms', label: 'Form Controls' },
          { id: 'data', label: 'Cards & Feedback' },
          { id: 'overlay', label: 'Modals, Drawers & Toasts' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Panel 1: Buttons & Icons */}
      <TabPanel id="buttons" activeTab={activeTab}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Buttons (Variants & Sizes)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Button variant="primary" size="sm">Primary Sm</Button>
              <Button variant="primary" size="md">Primary Md</Button>
              <Button variant="primary" size="lg">Primary Lg</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="secondary" leftIcon={<Sparkles size={16} />}>Secondary</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Action</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Icon Buttons</h4>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <IconButton icon={<Heart size={20} />} aria-label="Like reel" variant="ghost" />
              <IconButton icon={<Share2 size={20} />} aria-label="Share reel" variant="secondary" />
              <IconButton icon={<Send size={20} />} aria-label="Send message" variant="primary" />
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* Panel 2: Form Controls */}
      <TabPanel id="forms" activeTab={activeTab}>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
            <FormField id="f-name" label="Full Name" hint="Enter your legal display name" required>
              <Input id="f-name" placeholder="e.g. Priya Sharma" />
            </FormField>

            <FormField id="f-email" label="Email Address" error="Please enter a valid email format" required>
              <Input id="f-email" error defaultValue="invalid-email" />
            </FormField>

            <FormField id="f-language" label="Primary Language">
              <Select
                id="f-language"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: 'Hindi (हिन्दी)' },
                  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
                ]}
              />
            </FormField>

            <FormField id="f-script" label="Reel Script (Textarea)">
              <Textarea id="f-script" placeholder="Write your punchy reel script here..." />
            </FormField>
          </div>

          <Divider label="Toggles & Options" />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'center' }}>
            <Checkbox id="cb-consent" label="I agree to zero tracking & public attribution terms" defaultChecked />
            <Switch
              id="sw-notifications"
              label="Push Notifications"
              checked={switchChecked}
              onChange={(e) => setSwitchChecked(e.target.checked)}
            />
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Radio
                id="r-1"
                name="plan"
                label="Free Plan"
                checked={radioSelected === 'opt1'}
                onChange={() => setRadioSelected('opt1')}
              />
              <Radio
                id="r-2"
                name="plan"
                label="Creator Pro"
                checked={radioSelected === 'opt2'}
                onChange={() => setRadioSelected('opt2')}
              />
            </div>
          </div>
        </Card>
      </TabPanel>

      {/* Panel 3: Cards, Data & Progress */}
      <TabPanel id="data" activeTab={activeTab}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Badges & Status Chips</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Badge variant="default">Default Chip</Badge>
              <Badge variant="primary" icon={<Sparkles size={12} />}>AI Curated</Badge>
              <Badge variant="sage">Sage Highlight</Badge>
              <Badge variant="moss">Moss Fill</Badge>
              <Badge variant="success" icon={<Check size={12} />}>Verified Creator</Badge>
              <Badge variant="warning">Queue Busy</Badge>
              <Badge variant="danger">Flagged</Badge>
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Avatars & XP Gamification Rings</h4>
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <Avatar fallback="PS" size="sm" />
              <Avatar fallback="VS" size="md" level={5} />
              <Avatar fallback="RK" size="lg" level={14} showRing />
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Progress Bar & Progress Ring</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '400px' }}>
              <ProgressBar value={68} label="Token Generation Quota" />
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <ProgressRing value={75}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>75%</span>
                </ProgressRing>
                <span>XP Streak Progress (Day 6 of 7)</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Skeleton Shimmer</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: '360px' }}>
              <Skeleton width="100%" height={24} />
              <Skeleton width="75%" height={16} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Skeleton width={44} height={44} variant="circle" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton width="100%" height={16} />
                  <Skeleton width="60%" height={12} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Tooltip</h4>
            <Tooltip content="Microsoft Edge-TTS neural speech synthesis">
              <Button variant="secondary">Hover for Tooltip</Button>
            </Tooltip>
          </Card>

          <Card>
            <EmptyState
              title="No Reels in this Collection"
              description="Start creating custom AI vertical reels with instant preview and Edge-TTS voiceovers."
              action={<Button variant="primary" leftIcon={<Film size={16} />}>Create Reel</Button>}
            />
          </Card>
        </div>
      </TabPanel>

      {/* Panel 4: Modals & Toasts */}
      <TabPanel id="overlay" activeTab={activeTab}>
        <Card>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Accessible Overlays & Toasts</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open Accessible Modal
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open Mobile Sheet
            </Button>
            <Button variant="ghost" onClick={() => success('Reel rendered successfully in 720p!')}>
              Trigger Success Toast
            </Button>
            <Button variant="ghost" onClick={() => error('Job failed: Quota limit reached')}>
              Trigger Error Toast
            </Button>
            <Button variant="ghost" onClick={() => warning('High server load detected')}>
              Trigger Warning Toast
            </Button>
          </div>
        </Card>

        {/* Modal Demo */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Forest & Paper Dialog"
          description="Focus trap, ESC listener, and scroll lock enabled."
        >
          <p style={{ marginBottom: 'var(--space-4)' }}>
            This modal meets WCAG 2.2 AA accessibility requirements with aria-modal=&quot;true&quot;, auto-focus, and restoring focus to the trigger on close.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>

        {/* Sheet Demo */}
        <Sheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Quick Action Drawer"
          description="Optimized for touch viewports with slide-up animation."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
            <Button variant="secondary" leftIcon={<Film size={18} />} onClick={() => setSheetOpen(false)}>Save to Gallery</Button>
            <Button variant="secondary" leftIcon={<Share2 size={18} />} onClick={() => setSheetOpen(false)}>Share Reel Link</Button>
            <Button variant="danger" onClick={() => setSheetOpen(false)}>Report Inappropriate Content</Button>
          </div>
        </Sheet>
      </TabPanel>
    </div>
  );
}
