import colors from '@/assets/images/colors';
import { deleteConnection, getConnection } from '@/helper-functions/connectionStorage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, PaperProvider } from 'react-native-paper';

export default function PcGamepadScreen() {
  const [connection, setConnection] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  const handleDeleteConnection = useCallback(async () => {
    await deleteConnection();
    setConnection(null);
    setIsLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadConnection = async () => {
        const savedConnection = await getConnection();

        if (isActive) {
          setConnection(savedConnection);
          setIsLoaded(true);
        }
      };

      loadConnection();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <PaperProvider>
      <View style={styles.container}>
        <MaterialIcons
          name="arrow-back-ios-new"
          size={22}
          color={colors.text}
          style={styles.backButton}
          onPress={() => router.back()}
        />

        {/* <View style={styles.logoShell}>
          <View style={styles.logoFrame}>
            <Logo width="100%" height="100%" />
          </View>
        </View> */}

        <View style={styles.content}>
          {isLoaded && connection ? (
            <>
              <View style={styles.connectionStatus}>
                <Text style={styles.text}>Paired</Text>
                <View style={styles.pcRow}>
                  <MaterialCommunityIcons
                    name="monitor-cellphone"
                    size={22}
                    color={colors.text}
                  />
                  <Text style={[styles.text, styles.pcName]}>{connection.name}</Text>
                </View>
              </View>

              <View style={styles.pairedActions}>
                <Button
                  mode="contained"
                  textColor={colors.background}
                  buttonColor={colors.accent}
                  labelStyle={styles.playLabel}
                  style={styles.playButton}
                  onPress={() =>
                    router.push({
                      pathname: '/gamepad',
                      params: {
                        ip: connection.ip,
                        code: connection.code,
                        phoneSessionId: connection.phoneSessionId,
                      },
                    })
                  }
                >
                  PLAY
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleDeleteConnection}
                  textColor={styles.unpairButton.borderColor}
                  icon={({ size, color }) => (
                    <MaterialIcons name="delete-outline" size={20} color={color} />
                  )}
                  style={styles.unpairButton}
                >
                  Unpair
                </Button>
              </View>
            </>
          ) : isLoaded ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No device connected</Text>

              <Button
                mode="outlined"
                textColor={colors.accent}
                style={styles.scanButton}
                onPress={() => router.push('/pc-gamepad/scanner')}
              >
                Scan to Connect
              </Button>

              <Text style={styles.helpText}>
                Please download the PC client from -website- and scan the QR code to
                connect.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 125,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 150,
  },
  backButton: {
    left: 28,
    position: 'absolute',
    top: 52,
    zIndex: 1,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 990,
    height: 150,
    justifyContent: 'center',
    width: 150,
  },
  logoFrame: {
    aspectRatio: 635 / 416,
    width: 112,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  connectionStatus: {
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  text: {
    color: colors.text,
    fontSize: 15,
  },
  pcRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 15,
  },
  pcName: {
    fontSize: 17,
    fontWeight: '600',
  },
  pairedActions: {
    alignItems: 'center',
    gap: 175,
    paddingTop: 24,
  },
  playButton: {
    width: 200,
  },
  playLabel: {
    fontSize: 15,
  },
  unpairButton: {
    borderColor: '#9d3131',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanButton: {
    borderColor: '#8d8995',
    marginTop: 8,
    width: 240,
  },
  helpText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 320,
    paddingTop: 54,
    textAlign: 'center',
  },
});
