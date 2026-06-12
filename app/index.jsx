import colors from '@/assets/images/colors';
import { APP_MODES, useMode } from '@/context/ModeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

// Disable font scaling globally to prevent layout breaking on devices with large system fonts
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;

export default function HomeScreen() {
  const { setMode } = useMode();
  const router = useRouter();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Ready to{'\n'}
            <Text style={styles.heroTitleHighlight}>Play</Text> ?
          </Text>
          <View style={styles.illustrationContainer}>
            <MaterialCommunityIcons name="controller" size={64} color={colors.accent} />
            <View style={styles.dotsContainer}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <MaterialCommunityIcons
              name="cloud-outline"
              size={72}
              color={colors.accent}
            />
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* <Text style={styles.mainTitle}>WEB GAMING</Text> */}
          <Text style={styles.mainDescription}>
            Full gamepad controls for {'\n'}gaming on the web
          </Text>

          <Pressable
            onPress={() => {
              setMode(APP_MODES.CLOUD_GAMING);
              router.push('/cloud-gamepad');
            }}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>PLAY</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 0.6 }}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
  },
  hero: {
    alignItems: 'center',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 55,
  },
  heroTitleHighlight: {
    color: colors.accent,
  },
  illustrationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },
  contentContainer: {
    alignItems: 'center',
    gap: 30,
    width: '100%',
  },
  mainTitle: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0,
    textAlign: 'center',
  },
  mainDescription: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 26,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  playButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 30,
    marginTop: 16,
    paddingHorizontal: 56,
    paddingVertical: 10,
  },
  playButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  playButtonText: {
    color: colors.background,
    // color: colors.text,
    fontSize: 15,
    // fontWeight: 'bold',
    letterSpacing: 1.1,
  },
});
