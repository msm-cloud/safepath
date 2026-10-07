import { type ReactNode, useEffect, useState } from 'react';
import { Modal, View } from 'react-native';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import { WhatsNew } from '@/constants/WhatsNew';
import { useLanguage } from '@/lib/language-context';
import { useOtaUpdate } from '@/lib/use-ota-update';
import { useSafetyActivity } from '@/lib/use-safety-activity';
import { hasSeenWhatsNew, markWhatsNewSeen } from '@/lib/whats-new-storage';
import { useTheme } from '@/theme';

// Mounted once at the root. Shows at most one of two dialogs: "update
// ready" (restart now / later) and, once per WhatsNew.id, the what's new
// note. Neither appears while an SOS, journey or live sharing is running,
// and an open one is withdrawn if one starts.
export default function AppUpdatePrompts() {
  const { language, t } = useLanguage();
  const { spacing } = useTheme();
  const { isUpdateReady, restartNow } = useOtaUpdate();
  const [updateDeferred, setUpdateDeferred] = useState(false);
  const [whatsNewDue, setWhatsNewDue] = useState(false);

  useEffect(() => {
    if (!WhatsNew.id) return;
    let cancelled = false;
    hasSeenWhatsNew(WhatsNew.id).then((seen) => {
      if (!cancelled && !seen) setWhatsNewDue(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showUpdate = isUpdateReady && !updateDeferred;
  const busy = useSafetyActivity(showUpdate || whatsNewDue);
  if (busy !== false) return null;

  if (showUpdate) {
    const defer = () => setUpdateDeferred(true);
    return (
      <PromptModal onRequestClose={defer}>
        <Text variant="title">{t('updateReadyTitle')}</Text>
        <Text variant="body" color="textSecondary">
          {t('updateReadyMessage')}
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title={t('updateRestartNow')} variant="primary" onPress={restartNow} />
          <Button title={t('updateLater')} variant="ghost" onPress={defer} />
        </View>
      </PromptModal>
    );
  }

  if (whatsNewDue) {
    const dismiss = () => {
      setWhatsNewDue(false);
      void markWhatsNewSeen(WhatsNew.id);
    };
    return (
      <PromptModal onRequestClose={dismiss}>
        <Text variant="title">{t('whatsNewTitle')}</Text>
        <View style={{ gap: spacing.sm }}>
          {WhatsNew[language].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text variant="body" color="primary">
                •
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Button title={t('whatsNewOk')} variant="primary" onPress={dismiss} />
        </View>
      </PromptModal>
    );
  }

  return null;
}

function PromptModal({
  children,
  onRequestClose,
}: {
  children: ReactNode;
  onRequestClose: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: spacing.xl,
          backgroundColor: colors.overlay,
        }}
      >
        <Card>
          <View style={{ gap: spacing.md }}>{children}</View>
        </Card>
      </View>
    </Modal>
  );
}
