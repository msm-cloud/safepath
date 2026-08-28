import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLanguage } from '@/lib/language-context';

export type OnboardingSlide = {
  icon: SymbolViewProps['name'];
  iconColor: string;
  iconBackgroundColor: string;
  heading: string;
  body: string;
};

// Generic, content-agnostic carousel — the actual student/guardian copy
// lives in components/OnboardingScreen.tsx, not here, so this can be
// reused for any future role or flow without changes. Swipeable via a
// plain paging ScrollView rather than pulling in a carousel dependency
// this project doesn't already have.
export default function OnboardingCarousel({
  slides,
  onFinish,
}: {
  slides: OnboardingSlide[];
  onFinish: () => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  // Falls back to the current window width for the very first render;
  // onLayout below immediately corrects this to the actual rendered
  // width, which is what real per-page scroll math needs (window width
  // can differ from this container's own width, e.g. web).
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const scrollViewRef = useRef<ScrollView>(null);

  const isLast = index === slides.length - 1;

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setIndex(newIndex);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    const nextIndex = index + 1;
    scrollViewRef.current?.scrollTo({ x: nextIndex * pageWidth, animated: true });
    setIndex(nextIndex);
  };

  return (
    <View
      style={styles.container}
      onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
    >
      <Pressable
        style={styles.skip}
        onPress={onFinish}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>{t('onboardingSkipButton')}</Text>
      </Pressable>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.scroll}
      >
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: pageWidth }]}>
            <View style={[styles.iconBadge, { backgroundColor: slide.iconBackgroundColor }]}>
              <SymbolView name={slide.icon} tintColor={slide.iconColor} size={48} />
            </View>
            <Text style={styles.heading}>{slide.heading}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {isLast ? t('onboardingGetStartedButton') : t('onboardingNextButton')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skip: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  scroll: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 16,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1c1c1e',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#666',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    backgroundColor: '#2f95dc',
    width: 20,
  },
  nextButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 28,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
