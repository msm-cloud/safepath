import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';

// Repeating vibration pattern ([wait, buzz, pause] in ms) for the ringing.
// Vibration.vibrate(pattern, true) loops natively via the OS vibrator
// service, so it keeps buzzing even if the app is backgrounded mid-ring; a
// JS timer loop would stop there (see ALARM_VIBRATION_PATTERN in
// app/(guardian)/index.tsx for the same fix).
const FAKE_CALL_RING_VIBRATION_PATTERN = [0, 500, 300];

export type FakeCall = {
  callerName: string;
  // Off: vibrate only.
  ringOutLoud: boolean;
};

export type FakeCallFlowProps = {
  // A call rings as soon as this is set; the setup screen
  // (app/(tabs)/fake-call.tsx) owns the choices, this owns the ringing and
  // the in-call screen.
  call: FakeCall | null;
  onEnd: () => void;
};

export default function FakeCallFlow({ call, onEnd }: FakeCallFlowProps) {
  const { t } = useLanguage();

  const [answered, setAnswered] = useState(false);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const ringing = call !== null && !answered;
  const ringOutLoud = call?.ringOutLoud ?? false;

  // Synthesized tone, see scripts/gen-fake-call-ring.mjs. It plays on the
  // media stream, so the media volume sets how loud it rings.
  const ringPlayer = useAudioPlayer(require('@/assets/sounds/fake-call-ring.wav'));
  useEffect(() => {
    // The player is a mutable handle; setting loop on it is its API.
    // eslint-disable-next-line react-hooks/immutability
    ringPlayer.loop = true;
  }, [ringPlayer]);

  useEffect(() => {
    if (!ringing) return;
    Vibration.vibrate(FAKE_CALL_RING_VIBRATION_PATTERN, true);
    if (ringOutLoud) {
      ringPlayer.seekTo(0);
      ringPlayer.play();
    }
    return () => {
      Vibration.cancel();
      ringPlayer.pause();
    };
  }, [ringing, ringOutLoud, ringPlayer]);

  useEffect(() => {
    if (!answered) return;
    const id = setInterval(() => setCallElapsedSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [answered]);

  const handleAcceptFakeCall = () => {
    setCallElapsedSeconds(0);
    setAnswered(true);
  };

  const handleEndFakeCall = () => {
    setAnswered(false);
    onEnd();
  };

  const callerName = call?.callerName ?? '';

  return (
    <>
      {/* Fake incoming call — full-screen, mimics a real call screen. */}
      <Modal visible={ringing} animationType="fade">
        <View style={styles.fakeCallScreen}>
          <Text style={styles.fakeCallStatusLabel}>{t('fakeCallIncomingLabel')}</Text>
          <Text style={styles.fakeCallerName}>{callerName}</Text>
          <View style={styles.fakeCallActionsRow}>
            <Pressable
              style={[styles.fakeCallActionButton, styles.fakeCallDeclineButton]}
              onPress={handleEndFakeCall}
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
      <Modal visible={call !== null && answered} animationType="fade">
        <View style={styles.fakeCallScreen}>
          <Text style={styles.fakeCallStatusLabel}>{t('fakeCallInCallLabel')}</Text>
          <Text style={styles.fakeCallerName}>{callerName}</Text>
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
