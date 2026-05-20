import colors from '@/assets/images/colors';
import { saveConnection } from '@/helper-functions/connectionStorage';
// import NativeUDPModule from '@/specs/NativeUDPModule';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { InteractionManager, Platform, StyleSheet, Text, View } from 'react-native';
import dgram from 'react-native-nitro-dgram';

const PORT = 5005;

export default function ScannerScreen() {
  const [permission, setPermission] = useState(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let interaction = null;

    const ensurePermission = async () => {
      setIsRequestingPermission(true);

      try {
        const currentPermission = await Camera.getCameraPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (currentPermission.granted) {
          setPermission(currentPermission);
          setIsRequestingPermission(false);
          return;
        }

        interaction = InteractionManager.runAfterInteractions(() => {
          const requestCameraPermission = async () => {
            try {
              const nextPermission = await Camera.requestCameraPermissionsAsync();

              if (!cancelled) {
                setPermission(nextPermission);
              }
            } finally {
              if (!cancelled) {
                setIsRequestingPermission(false);
              }
            }
          };

          requestCameraPermission();
        });
      } catch (error) {
        console.error('Failed to resolve camera permission:', error);

        if (!cancelled) {
          setIsRequestingPermission(false);
        }
      }
    };

    ensurePermission();

    return () => {
      cancelled = true;
      interaction?.cancel();
    };
  }, []);

  const handleBarcodeScanned = async ({ data }) => {
    let payload;

    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    if (!payload?.ip || !payload?.code || !payload?.name) {
      return;
    }

    try {
      setScanned(true);

      const phoneSessionId = Math.floor(Math.random() * (65534 - 10000 + 1)) + 10000;

      await saveConnection({
        ip: payload.ip,
        code: payload.code,
        name: payload.name,
        phoneSessionId,
      });
      // NativeUDPModule.setDestination(payload.ip, PORT);

      const numericCode = Number(payload.code);

      if (Number.isFinite(numericCode)) {
        const pairingPacket = Array(16).fill(numericCode);
        pairingPacket[15] = phoneSessionId;

        // NativeUDPModule.sendPacket(pairingPacket);
        // NativeUDPModule.sendPacket(pairingPacket);
        // NativeUDPModule.sendPacket(pairingPacket);
        // NativeUDPModule.sendPacket(pairingPacket);

        const socket = dgram.createSocket('udp4');
        const buffer = new Uint8Array(pairingPacket.length * 2);
        for (let i = 0; i < pairingPacket.length; i++) {
          let val = Math.round(pairingPacket[i]);
          if (val < 0) val = 0;
          if (val > 65535) val = 65535;
          buffer[i * 2] = (val >> 8) & 0xff; // High byte
          buffer[i * 2 + 1] = val & 0xff; // Low byte
        }

        socket.send(buffer, 0, buffer.length, PORT, payload.ip);
        socket.send(buffer, 0, buffer.length, PORT, payload.ip);
        socket.send(buffer, 0, buffer.length, PORT, payload.ip);
        socket.send(buffer, 0, buffer.length, PORT, payload.ip);

        // Close the socket after a brief delay to ensure packets depart
        setTimeout(() => socket.close(), 500);

        console.log('4 pairing packets sent with code: ', payload.code);
      }

      router.replace({
        pathname: Platform.OS === 'ios' ? '/gamepad' : '/pc-gamepad',
        params: { ip: payload.ip, code: payload.code, phoneSessionId },
      });
    } catch (error) {
      console.error('Failed to save scanned connection:', error);
      setScanned(false);
    }
  };

  if (!permission || isRequestingPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Opening camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          {permission.canAskAgain
            ? 'Camera permission was denied. Reopen the scanner to try again.'
            : 'Camera permission is blocked. Please enable it in settings to scan the PC.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 50,
  },
  message: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
});
