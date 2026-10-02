import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { useUserSettings } from '@/lib/user-settings-context';

// Fake call escape — delay options (seconds) shown when "Fake Call" is
// tapped, plus the repeating vibration pattern ([wait, buzz, pause] in ms)
// used for the ringing. This replaced a setInterval + Haptics.
// notificationAsync loop — see the identical fix and rationale in
// app/(guardian)/index.tsx's ALARM_VIBRATION_PATTERN comment: RN suspends
// JS timers once the Activity leaves the foreground, so a locked/backgrounded
// phone would silently stop "ringing". Vibration.vibrate(pattern, true)
// loops natively via the OS vibrator service instead.
const FAKE_CALL_DELAY_OPTIONS_SECONDS = [0, 10, 30];
const FAKE_CALL_RING_VIBRATION_PATTERN = [0, 500, 300];

type FakeCallState = 'idle' | 'ringing' | 'in_call';

export type FakeCallFlowProps = {
  // The delay picker is opened by the Home tile; everything after that
  // (waiting, ringing, the in-call screen) is owned here.
  pickerVisible: boolean;
  onPickerClose: () => void;
};

export default function FakeCallFlow({ pickerVisible, onPickerClose }: FakeCallFlowProps) {
  const { t } = useLanguage();
  const { fakeCallCallerName } = useUserSettings();

  const [fakeCallState, setFakeCallState] = useState<FakeCallState>('idle');
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRingHaptics = useCallback(() => {
    Vibration.cancel();
  }, []);

  // Clears every pending timer on unmount — the delay picker's setTimeout,
  // the ringing vibration loop, and the in-call elapsed-time ticker are
  // otherwise all capable of outliving the component.
  useEffect(() => {
    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      stopRingHaptics();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [stopRingHaptics]);

  const startRinging = useCallback(() => {
    setFakeCallState('ringing');
    // Hands one repeating pattern to the OS vibrator service, which loops
    // it natively — approximates a ringtone's repeated buzz using only
    // what's already available (no audio library in this environment; see
    // Settings toggle hint / PR notes for why a synthesized tone was
    // skipped rather than pulled in as a new dep), and keeps ringing even
    // if the app is backgrounded while the delay/ringing is in progress.
    Vibration.vibrate(FAKE_CALL_RING_VIBRATION_PATTERN, true);
  }, []);

  const handleFakeCallDelaySelected = (delaySeconds: number) => {
    onPickerClose();
    if (delaySeconds === 0) {
      startRinging();
      return;
    }
    // The delay is the whole point — organic-looking, not an obvious
    // instant response to the person's own tap.
    ringTimeoutRef.current = setTimeout(startRinging, delaySeconds * 1000);
  };

  const handleAcceptFakeCall = () => {
    stopRingHaptics();
    setCallElapsedSeconds(0);
    setFakeCallState('in_call');
    callTimerRef.current = setInterval(() => {
      setCallElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleDeclineFakeCall = () => {
    stopRingHaptics();
    setFakeCallState('idle');
  };

  const handleEndFakeCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setFakeCallState('idle');
  };

  return (
    <>
      {/* Delay picker — a small modal, not a full-screen overlay; the
        full-screen treatment is reserved for the ringing/in-call states
        below, which need to look convincing. */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={onPickerClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onPickerClose}>
          <View style={styles.delayPickerCard}>
            <Text style={styles.delayPickerTitle}>{t('fakeCallDelayPickerTitle')}</Text>
            {FAKE_CALL_DELAY_OPTIONS_SECONDS.map((seconds) => (
              <Pressable
                key={seconds}
                style={styles.delayOption}
                onPress={() => handleFakeCallDelaySelected(seconds)}
              >
                <Text style={styles.delayOptionText}>
                  {seconds === 0
                    ? t('fakeCallDelayNow')
                    : t('fakeCallDelaySeconds', { n: seconds })}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Fake incoming call — full-screen, mimics a real call screen. */}
      <Modal visible={fakeCallState === 'ringing'} animationType="fade">
        <View style={styles.fakeCallScreen}>
          <Text style={styles.fakeCallStatusLabel}>{t('fakeCallIncomingLabel')}</Text>
          <Text style={styles.fakeCallerName}>
            {fakeCallCallerName || t('fakeCallDefaultCallerName')}
          </Text>
          <View style={styles.fakeCallActionsRow}>
            <Pressable
              style={[styles.fakeCallActionButton, styles.fakeCallDeclineButton]}
              onPress={handleDeclineFakeCall}
            >
              <Text style={styles.fakeCallActionButtonText}>{t('fakeCallDeclineButton')}</Text>
            </Pressable>
            <Pressable
              style={[styles.fakeCallActionButton, styles.fakeCallAcceptButton]}
              onPress={handleAcceptFakeCall}
            >
              <Text style={styles.fakeCallActionButtonText}>{t('fakeCallAcceptButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Fake in-call screen. */}
      <Modal visible={fakeCallState === 'in_call'} animationType="fade">
        <View style={styles.fakeCallScreen}>
          <Text style={styles.fakeCallStatusLabel}>{t('fakeCallInCallLabel')}</Text>
          <Text style={styles.fakeCallerName}>
            {fakeCallCallerName || t('fakeCallDefaultCallerName')}
          </Text>
          <Text style={styles.fakeCallTimer}>{formatCallDuration(callElapsedSeconds)}</Text>
          <Pressable
            style={[
              styles.fakeCallActionButton,
              styles.fakeCallDeclineButton,
              styles.fakeCallEndButtonWrap,
            ]}
            onPress={handleEndFakeCall}
          >
            <Text style={styles.fakeCallActionButtonText}>{t('fakeCallEndButton')}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function formatCallDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// The call screens keep their own phone-call look until the fake call
// redesign (docs/plans/fake-call-and-test-sos.md).
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  delayPickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  delayPickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  delayOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  delayOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  fakeCallScreen: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fakeCallStatusLabel: {
    color: '#aaa',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fakeCallerName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  fakeCallTimer: {
    color: '#ccc',
    fontSize: 18,
    marginTop: 4,
  },
  fakeCallActionsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 48,
  },
  fakeCallActionButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 130,
    alignItems: 'center',
  },
  fakeCallAcceptButton: {
    backgroundColor: '#1a7f37',
  },
  fakeCallDeclineButton: {
    backgroundColor: '#d33',
  },
  fakeCallEndButtonWrap: {
    marginTop: 48,
  },
  fakeCallActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
