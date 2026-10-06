import type { SymbolViewProps } from 'expo-symbols';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { use, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import Button from '@/components/ui/Button';
import IconTile, { type IconTileTone } from '@/components/ui/IconTile';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { localizeDigits, t as translate, type TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';
import type { ScreenBackground } from '@/theme/backgrounds';

export type OnboardingSlide = {
  key: string;
  // Left out on slides with `content`, which need the space.
  icon?: SymbolViewProps['name'];
  tone?: IconTileTone;
  heading: TranslationKey;
  body?: TranslationKey;
  // Extra content under the text, e.g. the checklist on the last slide.
  content?: ReactNode;
  // Shown instead of Next, so only for the last slide; must include a way
  // to finish.
  actions?: ReactNode;
  // Small print after the actions, so it never pushes them off screen.
  note?: ReactNode;
};

const ICON_TILE_SIZE = 72;
const PROGRESS_HEIGHT = 6;

// Generic carousel; the student/guardian copy lives in
// components/OnboardingScreen.tsx. Swipeable via a plain paging ScrollView
// rather than pulling in a carousel dependency this project doesn't
// already have.
export default function OnboardingCarousel({
  slides,
  background,
  onFinish,
}: {
  slides: OnboardingSlide[];
  background: ScreenBackground;
  onFinish: () => void;
}) {
  const { t, language } = useLanguage();
  const { colors, radius, sizes, spacing } = useTheme();
  const [index, setIndex] = useState(0);
  // Falls back to the window width for the first render; onLayout corrects
  // it to the container's real width, which the page maths needs.
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const scrollViewRef = useRef<ScrollView>(null);
  // Replayed from Settings it sits under a navigation header, which already
  // covers the status bar.
  const underHeader = (use(HeaderHeightContext) ?? 0) > 0;

  const isLast = index === slides.length - 1;
  const current = slides[index];
  // The boards repeat each heading in the other language underneath.
  const otherLanguage = language === 'bn' ? 'en' : 'bn';

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  const handleNext = () => {
    const nextIndex = index + 1;
    scrollViewRef.current?.scrollTo({ x: nextIndex * pageWidth, animated: true });
    setIndex(nextIndex);
  };

  return (
    <Screen
      background={background}
      scroll={false}
      padded={false}
      edges={underHeader ? ['bottom'] : ['top', 'bottom']}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: sizes.screenGutter,
          paddingTop: spacing.lg,
          minHeight: sizes.buttonSmall + spacing.lg,
        }}
      >
        <View
          style={{ flex: 1, flexDirection: 'row', gap: spacing.xs }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: slides.length, now: index + 1 }}
        >
          {slides.map((slide, i) => (
            <View
              key={slide.key}
              style={{
                flex: 1,
                height: PROGRESS_HEIGHT,
                borderRadius: radius.pill,
                backgroundColor: colors.onOverlay,
                opacity: i <= index ? 1 : 0.3,
              }}
            />
          ))}
        </View>
        <Text variant="label">
          {t('onboardingStepCount', {
            n: localizeDigits(index + 1, language),
            total: localizeDigits(slides.length, language),
          })}
        </Text>
        {!isLast && (
          <Button
            title={t('onboardingSkipButton')}
            variant="ghost"
            size="small"
            fullWidth={false}
            onPress={onFinish}
          />
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
        style={{ flex: 1 }}
      >
        {slides.map((slide) => (
          <ScrollView
            key={slide.key}
            style={{ width: pageWidth }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              gap: slide.content ? spacing.md : spacing.lg,
              paddingHorizontal: sizes.screenGutter,
              paddingVertical: slide.content ? spacing.lg : spacing.xl,
            }}
          >
            {slide.icon && <IconTile icon={slide.icon} tone={slide.tone} size={ICON_TILE_SIZE} />}
            <View style={{ gap: spacing.sm }}>
              {/* A slide with a checklist and actions needs the room, so its
                  heading steps down a size. */}
              <Text variant={slide.content ? 'h2' : 'h1'} accessibilityRole="header">
                {t(slide.heading)}
              </Text>
              {/* Decorative: the same heading in the other language. */}
              <Text variant="title" importantForAccessibility="no" accessibilityElementsHidden>
                {translate(otherLanguage, slide.heading)}
              </Text>
            </View>
            {slide.body && <Text>{t(slide.body)}</Text>}
            {slide.content}
            {/* In the scroll rather than pinned below it, so a long slide
                keeps its content visible instead of being squeezed. */}
            {slide.actions && <View style={{ gap: spacing.sm }}>{slide.actions}</View>}
            {slide.note}
          </ScrollView>
        ))}
      </ScrollView>

      {!current.actions && (
        <View
          style={{
            paddingHorizontal: sizes.screenGutter,
            paddingBottom: spacing.xl,
            paddingTop: spacing.sm,
          }}
        >
          <Button title={t('onboardingNextButton')} onPress={handleNext} />
        </View>
      )}
    </Screen>
  );
}
