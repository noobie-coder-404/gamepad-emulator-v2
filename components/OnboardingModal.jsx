import colors from '@/assets/images/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

// 🚨 Replace these with the actual filenames from your "onboarding illustrations" folder
const ILLUSTRATIONS = [
  {
    id: 1,
    type: 'image',
    title: 'Show Gamepad',
    source: require('@/assets/onboarding-illustrations/1-reveal-gamepad.png'),
  },
  {
    id: 2,
    type: 'image',
    title: 'Hide Gamepad',
    source: require('@/assets/onboarding-illustrations/2-hide-gamepad.png'),
  },
  {
    id: '3',
    type: 'image',
    title: 'Hold your phone in the following position',
    source: require('@/assets/onboarding-illustrations/3-position.png'),
  },
  {
    id: '4',
    type: 'image',
    title: 'LT and LB',
    source: require('@/assets/onboarding-illustrations/4-left-index.png'),
  },
  {
    id: '5',
    type: 'image',
    title: 'RT and RB',
    source: require('@/assets/onboarding-illustrations/5-right-index.png'),
  },
  {
    id: '6',
    type: 'image',
    title: 'Swipe to Look',
    source: require('@/assets/onboarding-illustrations/6-swipe-to-look.png'),
  },
  {
    id: '7',
    type: 'video',
    title: 'Using ABXY Buttons',
    source: require('@/assets/onboarding-illustrations/7-abxy.mp4'),
  },
  {
    id: '8',
    type: 'video',
    title: 'Using the D-Pad',
    source: require('@/assets/onboarding-illustrations/8-dpad.mp4'),
  },
];

function VideoSlide({ source, shouldPlay, style }) {
  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  return (
    <VideoView
      style={style}
      player={player}
      nativeControls={false}
      contentFit="contain"
    />
  );
}

export default function OnboardingModal({ visible, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const modalWidth = Math.min(width * 0.8, 1000);
  const modalHeight = Math.min(height * 0.9, 800);

  const handleNext = () => {
    if (currentIndex < ILLUSTRATIONS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.slide, { width: modalWidth }]}>
        {item.type === 'video' ? (
          <VideoSlide
            source={item.source}
            style={styles.media}
            shouldPlay={currentIndex === ILLUSTRATIONS.indexOf(item)}
          />
        ) : (
          <Image
            source={item.source}
            style={[styles.media, { backgroundColor: colors.background }]}
            resizeMode="contain"
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: modalWidth, height: modalHeight }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{ILLUSTRATIONS[currentIndex].title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={30} color={colors.text} />
            </Pressable>
          </View>

          {/* Carousel Area */}
          <View style={styles.content}>
            <FlatList
              ref={flatListRef}
              data={ILLUSTRATIONS}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              horizontal
              pagingEnabled
              extraData={modalWidth}
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
              scrollEventThrottle={16}
            />

            {/* Floating Left Arrow */}
            {currentIndex > 0 && (
              <Pressable style={[styles.arrowBtn, styles.arrowLeft]} onPress={handlePrev}>
                <Ionicons name="chevron-back" size={28} color="#1C212A" />
              </Pressable>
            )}

            {/* Floating Right Arrow */}
            {currentIndex < ILLUSTRATIONS.length - 1 && (
              <Pressable
                style={[styles.arrowBtn, styles.arrowRight]}
                onPress={handleNext}
              >
                <Ionicons name="chevron-forward" size={28} color="#1C212A" />
              </Pressable>
            )}
          </View>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <View style={styles.pagination}>
              {ILLUSTRATIONS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentIndex && styles.dotActive]}
                />
              ))}
            </View>
            <Pressable style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {currentIndex === ILLUSTRATIONS.length - 1 ? 'FINISH' : 'NEXT'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(141, 137, 149, 0.3)',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  content: { flex: 1, position: 'relative' },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: '100%' },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    // borderTopWidth: 1,
    // borderTopColor: 'rgba(141, 137, 149, 0.3)',
  },
  pagination: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextBtnText: { color: colors.background, fontSize: 14, fontWeight: 'bold' },
});
