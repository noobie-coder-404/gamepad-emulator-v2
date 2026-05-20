import colors from '@/assets/images/colors';
import { APP_MODES, useMode } from '@/context/ModeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const options = [
  {
    title: 'WEB GAMING',
    description: 'Full gamepad controls for gaming on the web',
    icon: 'cloud-outline',
    log: 'Cloud Gaming',
    mode: APP_MODES.CLOUD_GAMING,
    route: '/cloud-gamepad',
  },
  {
    title: 'PC GAMEPAD',
    description: 'Use your device as gamepad for your PC',
    icon: 'gamepad-variant-outline',
    log: 'Gamepad for PC',
    mode: APP_MODES.PC_GAMEPAD,
    route: Platform.OS === 'ios' ? '/gamepad' : '/pc-gamepad',
  },
];

export default function HomeScreen() {
  const { setMode } = useMode();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const cardSize = isWide ? Math.min(240, (width - 96) / 2) : Math.min(250, width - 56);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Ready to{'\n'}
          <Text style={styles.heroTitleHighlight}>Play</Text> ?
        </Text>
      </View>

      <View style={[styles.cards, isWide && styles.cardsWide]}>
        {options.map((option) => (
          <Pressable
            key={option.title}
            onPress={() => {
              setMode(option.mode);
              console.log(option.log);
              if (option.route) {
                router.push(option.route);
              }
            }}
            style={({ pressed }) => [
              styles.card,
              { width: cardSize },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardContent}>
              <MaterialCommunityIcons
                name={option.icon}
                size={56}
                color={colors.accent}
              />
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <MaterialCommunityIcons name="arrow-right" size={35} color={colors.text} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 48,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  hero: {
    alignItems: 'center',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 55,
  },
  heroTitleHighlight: {
    color: colors.accent,
  },
  cards: {
    alignItems: 'center',
    gap: 26,
    width: '100%',
  },
  cardsWide: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  card: {
    aspectRatio: 1,
    backgroundColor: '#1d2831',
    borderColor: '#8d8995',
    borderRadius: 34,
    borderWidth: 1.5,
    padding: 22,
  },
  cardPressed: {
    backgroundColor: '#22313b',
    borderColor: colors.accent,
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  arrowCircle: {
    position: 'absolute',
    top: 22,
    right: 22,
    alignItems: 'center',
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // borderColor: 'rgba(255, 255, 255, 0.4)',
    // borderWidth: 1,
    borderRadius: 16,
    // height: 32,
    justifyContent: 'center',
    // width: 32,
    transform: [{ rotate: '315deg' }],
    opacity: 0.6,
  },
  cardTextContainer: {
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  cardDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
});
