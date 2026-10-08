'use client';

import { type ReactNode, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Banner from '@/components/ui/Banner';
import Button, { buttonClasses, type ButtonVariant } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { t as translate, type Language, type TranslationKey } from '@/lib/translations';

// Swatches are grouped the way the tokens are used: a fill and the text
// colour that sits on it.
const SWATCHES: { name: string; bg: string; fg: string }[] = [
  { name: 'bg / text', bg: 'bg-bg', fg: 'text-text' },
  { name: 'surface / text-secondary', bg: 'bg-surface', fg: 'text-text-secondary' },
  { name: 'surface-muted / text-muted', bg: 'bg-surface-muted', fg: 'text-text-muted' },
  { name: 'track / text', bg: 'bg-track', fg: 'text-text' },
  { name: 'ink / on-ink', bg: 'bg-ink', fg: 'text-on-ink' },
  { name: 'primary / on-primary', bg: 'bg-primary', fg: 'text-on-primary' },
  { name: 'primary-soft / on-primary-soft', bg: 'bg-primary-soft', fg: 'text-on-primary-soft' },
  { name: 'danger / on-danger', bg: 'bg-danger', fg: 'text-on-danger' },
  { name: 'danger-soft / on-danger-soft', bg: 'bg-danger-soft', fg: 'text-on-danger-soft' },
  { name: 'success-soft / on-success-soft', bg: 'bg-success-soft', fg: 'text-on-success-soft' },
  { name: 'warning-soft / on-warning-soft', bg: 'bg-warning-soft', fg: 'text-on-warning-soft' },
  { name: 'info-soft / on-info-soft', bg: 'bg-info-soft', fg: 'text-on-info-soft' },
];

const TYPE_SCALE: { className: string; key: TranslationKey }[] = [
  { className: 'type-display', key: 'dashboardTitle' },
  { className: 'type-h1', key: 'settingsTitle' },
  { className: 'type-h2', key: 'liveLocationTitle' },
  { className: 'type-title', key: 'pastAlertsTitle' },
  { className: 'type-button', key: 'signInButton' },
  { className: 'type-body', key: 'dashboardSubtitle' },
  { className: 'type-body-sm', key: 'recordedLocationSubtitle' },
  { className: 'type-label', key: 'linkToSomeoneLabel' },
  { className: 'type-caption', key: 'noResolvedAlertsYet' },
  { className: 'type-micro', key: 'liveLocationBadge' },
];

const SURFACE_BUTTONS: { variant: ButtonVariant; key: TranslationKey }[] = [
  { variant: 'ink', key: 'signInButton' },
  { variant: 'primary', key: 'linkButton' },
  { variant: 'secondary', key: 'saveButton' },
  { variant: 'ghost', key: 'forgotPasswordLink' },
  { variant: 'danger', key: 'markResolvedButton' },
  { variant: 'dangerOutline', key: 'silenceAlarmButton' },
];

export default function UiGallery() {
  // Local only: the real language toggle saves to the signed-in profile,
  // which a reference page should never do.
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(language, key, params);

  return (
    <main lang={language} className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-gutter py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="type-h1">UI gallery</h1>
        <SegmentedControl
          aria-label="Language"
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: translate('en', 'languageEn'), lang: 'en' },
            { value: 'bn', label: translate('bn', 'languageBn'), lang: 'bn' },
          ]}
        />
      </header>

      <Section title="Colours">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map((swatch) => (
            <div
              key={swatch.name}
              className={`rounded-md border-[1.5px] border-border p-4 type-label ${swatch.bg} ${swatch.fg}`}
            >
              {swatch.name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map(({ className, key }) => (
            <div
              key={className}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <code lang="en" className="w-28 shrink-0 type-caption text-text-muted">
                {className}
              </code>
              <p className={className}>{t(key)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          {SURFACE_BUTTONS.map(({ variant, key }) => (
            <Button key={variant} variant={variant}>
              {t(key)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="small">{t('saveButton')}</Button>
          <Button size="small" variant="secondary">
            {t('settingsLink')}
          </Button>
          <Button loading loadingTitle={t('linkingButton')}>
            {t('linkButton')}
          </Button>
          <Button disabled>{t('signInButton')}</Button>
          <a href="#buttons" className={buttonClasses({ variant: 'secondary', size: 'small' })}>
            {t('viewOnMap')}
          </a>
        </div>
        <Button fullWidth>{t('signInButton')}</Button>
        <div className="flex flex-wrap gap-3 rounded-xl bg-danger p-4 shadow-sos">
          <Button variant="emergencyCall" size="small">
            {t('viewLastKnownLocation')}
          </Button>
          <Button variant="onDangerOutline" size="small">
            {t('markResolvedButton')}
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-4">
          <Input label={t('linkToSomeoneLabel')} placeholder={t('inviteCodePlaceholder')} />
          <Input
            label={t('linkToSomeoneLabel')}
            defaultValue="ABCD EFGH"
            error={t('invalidOrUsedCode')}
          />
          <Input
            label={t('settingsTitle')}
            helper={t('phonePlaceholder')}
            disabled
            defaultValue="+880"
          />
          <PasswordInput label={t('passwordPlaceholder')} placeholder={t('passwordPlaceholder')} />
        </div>
      </Section>

      <Section title="Banners">
        <div className="grid gap-3">
          <Banner tone="warning" action={<a href="#banners">{t('phoneNotSavedSettingsLink')}</a>}>
            {t('phoneNotSavedMessage')}
          </Banner>
          <Banner tone="danger">{t('sessionExpired')}</Banner>
          <Banner tone="success">{t('nameSavedMessage')}</Banner>
          <Banner tone="info">{t('enableSoundAlertsHint')}</Banner>
          <Banner tone="primary" title={t('dashboardTitle')}>
            {t('dashboardSubtitle')}
          </Banner>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge tone="sos">{t('activeAlertLabel')}</Badge>
          <Badge tone="danger">{t('missedCheckinLabel')}</Badge>
          <Badge tone="info">{t('liveLocationBadge')}</Badge>
          <Badge tone="warning">{t('liveLocationStaleBadge')}</Badge>
          <Badge tone="success">{t('recordedLocationRecordingOn')}</Badge>
          <Badge tone="primary">{t('settingsLink')}</Badge>
          <Badge>{t('recordedLocationRecordingOff')}</Badge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card as="article" className="flex flex-col gap-2">
            <Badge tone="info">{t('liveLocationBadge')}</Badge>
            <p className="type-title">{t('unnamedUser')}</p>
            <p className="type-body-sm text-text-muted">
              {t('liveLocationUpdated', { ago: t('secondsAgo', { n: 12 }) })}
            </p>
            <a href="#cards" className="type-label text-primary underline">
              {t('viewOnMap')}
            </a>
          </Card>
          <Card variant="muted" className="flex flex-col gap-2">
            <p className="type-title">{t('pastAlertsTitle')}</p>
            <p className="type-body-sm text-text-muted">{t('noResolvedAlertsYet')}</p>
          </Card>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase();
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h2 id={`${id}-heading`} lang="en" className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
