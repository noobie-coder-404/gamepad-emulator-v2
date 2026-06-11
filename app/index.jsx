import colors from '@/assets/images/colors';
import { APP_MODES, useMode } from '@/context/ModeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const GAIN_PROFILES = {
  normal: 1,
  fps: 1.5,
  pro: 2,
};
const sensitivityMax = 20;

export default function HomeScreen() {
  const { setMode } = useMode();
  const router = useRouter();

  const [trackpadMode, setTrackpadMode] = useState(true);
  const [gain, setGain] = useState(1.5);
  const [sensitivity, setSensitivity] = useState(10);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTrackpadMode = await AsyncStorage.getItem('trackpadMode');
        if (savedTrackpadMode !== null) setTrackpadMode(JSON.parse(savedTrackpadMode));
        const savedGain = await AsyncStorage.getItem('gain');
        if (savedGain !== null) setGain(JSON.parse(savedGain));
        const savedSensitivity = await AsyncStorage.getItem('trackpadSensitivity');
        if (savedSensitivity !== null) setSensitivity(JSON.parse(savedSensitivity));
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };
    loadSettings();
  }, []);

  const saveSetting = async (key, value, setter) => {
    setter(value);
    await AsyncStorage.setItem(key, JSON.stringify(value));
  };

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
          {/* <Text style={styles.heroTitle}>
            Ready to{'\n'}
            <Text style={styles.heroTitleHighlight}>Play</Text> ?
          </Text> */}
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

          <View style={styles.settingsContainer}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Right Stick Mode</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  style={[styles.segmentButton, trackpadMode && styles.segmentActive]}
                  onPress={() => saveSetting('trackpadMode', true, setTrackpadMode)}
                >
                  <Text
                    style={[styles.segmentText, trackpadMode && styles.segmentTextActive]}
                  >
                    Swiping
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentButton, !trackpadMode && styles.segmentActive]}
                  onPress={() => saveSetting('trackpadMode', false, setTrackpadMode)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !trackpadMode && styles.segmentTextActive,
                    ]}
                  >
                    Joystick
                  </Text>
                </Pressable>
              </View>
            </View>

            {trackpadMode && (
              <>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Sensitivity</Text>
                  <View style={styles.stepperControl}>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() =>
                        saveSetting(
                          'trackpadSensitivity',
                          Math.max(0, sensitivity - 1),
                          setSensitivity
                        )
                      }
                    >
                      <Ionicons name="remove" size={20} color={colors.text} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{sensitivity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() =>
                        saveSetting(
                          'trackpadSensitivity',
                          Math.min(sensitivityMax, sensitivity + 1),
                          setSensitivity
                        )
                      }
                    >
                      <Ionicons name="add" size={20} color={colors.text} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Mode</Text>
                  <View style={styles.segmentedControl}>
                    {Object.keys(GAIN_PROFILES).map((profileKey) => {
                      const profileValue = GAIN_PROFILES[profileKey];
                      const isActive = gain === profileValue;
                      return (
                        <Pressable
                          key={profileKey}
                          style={[styles.segmentButton, isActive && styles.segmentActive]}
                          onPress={() => saveSetting('gain', profileValue, setGain)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              isActive && styles.segmentTextActive,
                            ]}
                          >
                            {profileKey === 'fps'
                              ? 'FPS'
                              : profileKey.charAt(0).toUpperCase() + profileKey.slice(1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 50,
    justifyContent: 'flex-start',
    paddingHorizontal: 28,
    // paddingTop: 40,
    paddingTop: 100,
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
    gap: 24,
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
  settingsContainer: {
    width: 260,
    marginTop: 40,
    gap: 20,
  },
  settingRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    gap: 8,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 4,
    width: '100%',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontSize: 11,
  },
  segmentTextActive: {
    color: colors.background,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: '100%',
  },
  stepperButton: {
    padding: 6,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
