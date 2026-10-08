import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, type ScrollView, type TextInput, View } from 'react-native';

import FakeCallFlow, { type FakeCall } from '@/components/FakeCallFlow';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ListGroup from '@/components/ui/ListGroup';
import Screen from '@/components/ui/Screen';
import SwitchRow from '@/components/ui/SwitchRow';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import {
  initialPrefs,
  otherNameFromSaved,
  type FakeCaller,
  type FakeCallPrefs,
  type PresetCallerLabels,
} from '@/lib/fake-call';
import { loadFakeCallPrefs, saveFakeCallPrefs } from '@/lib/fake-call-storage';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { translations, type TranslationKey } from '@/lib/translations';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme, type ThemeColors } from '@/theme';

const PRESET_LABELS: PresetCallerLabels = {
  ammu: Object.values(translations.fakeCallCallerAmmu),
  abbu: Object.values(translations.fakeCallCallerAbbu),
};

type CallerOption = {
  caller: FakeCaller;
  label: TranslationKey;
  initials?: TranslationKey;
  badge: keyof ThemeColors;
};

const CALLER_OPTIONS: CallerOption[] = [
  {
    caller: 'ammu',
    label: 'fakeCallCallerAmmu',
    initials: 'fakeCallCallerAmmuInitials',
    badge: 'primarySoft',
  },
  {
    caller: 'abbu',
    label: 'fakeCallCallerAbbu',
    initials: 'fakeCallCallerAbbuInitials',
    badge: 'warningSoft',
  },
  { caller: 'other', label: 'fakeCallCallerOther', badge: 'surfaceMuted' },
];

const BADGE_SIZE = 36;
const RADIO_SIZE = 20;

// Opened from the Home tile. Calls ring right away and only in the app;
// delayed calls wait for background ringing (docs/plans/fake-call-and-test-sos.md).
export default function FakeCallSetupScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { fakeCallCallerName, setFakeCallCallerName } = useUserSettings();

  // undefined while the device's last choices are being read, so the
  // screen never flashes the defaults first.
  const [storedPrefs, setStoredPrefs] = useState<Partial<FakeCallPrefs> | null | undefined>(
    undefined
  );
  const [changes, setChanges] = useState<Partial<FakeCallPrefs>>({});
  // null until edited: until then the field shows the saved name.
  const [otherNameDraft, setOtherNameDraft] = useState<string | null>(null);
  const [showNameMissing, setShowNameMissing] = useState(false);
  const [call, setCall] = useState<FakeCall | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const otherNameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to read without a user id; open on the defaults.
      setStoredPrefs(null);
      return;
    }
    loadFakeCallPrefs(userId).then((prefs) => {
      if (!cancelled) setStoredPrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const prefs: FakeCallPrefs = {
    ...initialPrefs(storedPrefs ?? null, fakeCallCallerName, PRESET_LABELS),
    ...changes,
  };
  const otherName = otherNameDraft ?? otherNameFromSaved(fakeCallCallerName, PRESET_LABELS);

  const updatePrefs = (change: Partial<FakeCallPrefs>) => {
    setChanges((current) => ({ ...current, ...change }));
    if (userId) void saveFakeCallPrefs(userId, { ...prefs, ...change });
  };

  const ring = () => {
    const option = CALLER_OPTIONS.find(({ caller }) => caller === prefs.caller);
    const name = prefs.caller === 'other' ? otherName.trim() : option ? t(option.label) : '';
    if (!name) {
      setShowNameMissing(true);
      return;
    }
    // Choosing Ammu or Abbu keeps the saved other name. A failed save is
    // left unreported: the call matters more than the setting, and the
    // name stays in the field.
    if (prefs.caller === 'other' && name !== fakeCallCallerName) {
      void setFakeCallCallerName(name);
    }
    Keyboard.dismiss();
    setCall({ callerName: name, ringOutLoud: prefs.ringOutLoud });
  };

  if (storedPrefs === undefined) return <Screen edges={[]}>{null}</Screen>;

  return (
    <Screen edges={[]} scrollRef={scrollViewRef} contentStyle={{ gap: spacing.lg }}>
      <Text variant="bodySm" color="textSecondary">
        {t('fakeCallSetupIntro')}
      </Text>

      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        <Text variant="label" accessibilityRole="header">
          {t('fakeCallWhoIsCalling')}
        </Text>
        {CALLER_OPTIONS.map((option) => (
          <CallerRow
            key={option.caller}
            option={option}
            selected={prefs.caller === option.caller}
            onSelect={() => {
              setShowNameMissing(false);
              updatePrefs({ caller: option.caller });
            }}
          />
        ))}
        {prefs.caller === 'other' && (
          <Input
            ref={otherNameInputRef}
            label={t('fakeCallCallerNameLabel')}
            value={otherName}
            onChangeText={(text) => {
              setOtherNameDraft(text);
              if (text.trim()) setShowNameMissing(false);
            }}
            error={showNameMissing ? t('fakeCallOtherNameMissing') : undefined}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={40}
            onFocus={() => scrollInputIntoView(scrollViewRef.current, otherNameInputRef)}
          />
        )}
      </View>

      <ListGroup>
        <SwitchRow
          title={t('fakeCallRingOutLoud')}
          hint={t('fakeCallRingOutLoudHint')}
          icon={{ ios: 'speaker.wave.2', android: 'volume_up', web: 'volume_up' }}
          value={prefs.ringOutLoud}
          onValueChange={(value) => updatePrefs({ ringOutLoud: value })}
        />
      </ListGroup>

      <View style={{ marginTop: 'auto', paddingTop: spacing.sm }}>
        <Button
          title={t('fakeCallRingNow')}
          variant="primary"
          icon={{ ios: 'phone.fill', android: 'call', web: 'call' }}
          onPress={ring}
        />
      </View>

      <FakeCallFlow call={call} onEnd={() => setCall(null)} />
    </Screen>
  );
}

type CallerRowProps = {
  option: CallerOption;
  selected: boolean;
  onSelect: () => void;
};

function CallerRow({ option, selected, onSelect }: CallerRowProps) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  // The selected border is thicker; padding makes up the difference so the
  // rows don't shift when the choice changes.
  const borderWidth = selected ? 2 : 1;
  const inset = (base: number) => base + 2 - borderWidth;

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityLabel={t(option.label)}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: inset(spacing.md),
        paddingHorizontal: inset(spacing.md + 2),
        borderRadius: radius.lg,
        borderWidth,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected
          ? colors.primarySoft
          : pressed
            ? colors.surfaceMuted
            : colors.surface,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          // On the selected row's tinted fill the badge's own tint would
          // vanish, so it turns to the plain surface, as on the board.
          backgroundColor: selected ? colors.surface : colors[option.badge],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {option.initials ? (
          <Text variant="micro">{t(option.initials)}</Text>
        ) : (
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            tintColor={colors.textSecondary}
            size={18}
          />
        )}
      </View>
      <Text variant="bodySm" weight="bold" style={{ flex: 1 }}>
        {t(option.label)}
      </Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: RADIO_SIZE,
          height: RADIO_SIZE,
          borderRadius: RADIO_SIZE / 2,
          borderWidth: 2,
          // textMuted keeps the empty ring at 3:1 against the row in both
          // schemes; the softer border tokens don't.
          borderColor: selected ? colors.primary : colors.textMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View
            style={{
              width: RADIO_SIZE / 2,
              height: RADIO_SIZE / 2,
              borderRadius: RADIO_SIZE / 4,
              backgroundColor: colors.primary,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
