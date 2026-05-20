import colors from '@/assets/images/colors';
import NewUrlModal from '@/components/NewUrlModal';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const DEFAULT_OPTIONS = [
  {
    id: 'def-1',
    name: 'Test Website 1',
    url: 'https://hardwaretester.com/gamepad',
  },
  {
    id: 'def-2',
    name: 'Test Website 2',
    url: 'https://gpadtester.com',
  },
  {
    id: 'def-3',
    name: 'Test Website 3',
    url: 'https://gamepad-tester.net',
  },
  {
    id: 'def-4',
    name: 'Test Website 4',
    url: 'https://webcammictest.com/gamepad',
  },
  {
    id: 'def-5',
    name: 'Test Website 5',
    url: 'https://gpadtester.net',
  },
];

export default function CloudGamepadScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const cardSize = isWide ? Math.min(240, (width - 96) / 2) : Math.min(250, width - 56);
  const [modalVisible, setModalVisible] = useState(false);
  const [websites, setWebsites] = useState(DEFAULT_OPTIONS);

  useEffect(() => {
    const loadWebsites = async () => {
      try {
        const savedWebsites = await AsyncStorage.getItem('cloud_websites_v2');
        if (savedWebsites) {
          setWebsites(JSON.parse(savedWebsites));
        } else {
          // Migration for users updating from the older version
          const oldCustom = await AsyncStorage.getItem('custom_cloud_websites');
          let initialWebsites = [...DEFAULT_OPTIONS];
          if (oldCustom) {
            const parsedOld = JSON.parse(oldCustom).map((site, i) => ({
              ...site,
              id: site.id || `custom-${Date.now()}-${i}`,
            }));
            initialWebsites = [...initialWebsites, ...parsedOld];
          }
          setWebsites(initialWebsites);
          await AsyncStorage.setItem(
            'cloud_websites_v2',
            JSON.stringify(initialWebsites)
          );
        }
      } catch (error) {
        console.error('Failed to load websites', error);
      }
    };
    loadWebsites();
  }, []);

  const handleAddWebsite = async (name, url) => {
    try {
      const newWebsites = [...websites, { id: `custom-${Date.now()}`, name, url }];
      setWebsites(newWebsites);
      await AsyncStorage.setItem('cloud_websites_v2', JSON.stringify(newWebsites));
    } catch (error) {
      console.error('Failed to save website', error);
    }
  };

  const handleDeleteWebsite = async (idToDelete) => {
    try {
      const newWebsites = websites.filter((site) => site.id !== idToDelete);
      setWebsites(newWebsites);
      await AsyncStorage.setItem('cloud_websites_v2', JSON.stringify(newWebsites));
    } catch (error) {
      console.error('Failed to delete website', error);
    }
  };

  const allOptions = [...websites, { isAddButton: true, id: 'add-btn' }];

  // Calculate exact grid width so the container centers, but wrapped items left-align inside it
  const gap = 26;
  const maxCols = Math.floor((width - 56 + gap) / (cardSize + gap));
  const gridWidth =
    isWide && maxCols > 0 ? maxCols * cardSize + (maxCols - 1) * gap : '100%';

  return (
    <View style={styles.container}>
      <MaterialIcons
        name="arrow-back-ios-new"
        size={22}
        color={colors.text}
        style={styles.backButton}
        onPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* <Text style={styles.title}>WEB GAMEPAD</Text> */}

        <View
          style={[
            styles.cards,
            isWide && styles.cardsWide,
            isWide && { width: gridWidth },
          ]}
        >
          {allOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                if (option.isAddButton) {
                  setModalVisible(true);
                } else {
                  router.push({
                    pathname: '/gamepad',
                    params: { url: option.url },
                  });
                }
              }}
              style={({ pressed }) => [
                styles.card,
                { width: cardSize },
                pressed && styles.cardPressed,
              ]}
            >
              {!option.isAddButton && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteWebsite(option.id)}
                >
                  <MaterialCommunityIcons name="delete" size={30} color={colors.text} />
                </Pressable>
              )}
              <View style={styles.cardContent}>
                {option.isAddButton ? (
                  <>
                    <MaterialCommunityIcons name="plus" size={64} color={colors.accent} />
                    <Text style={styles.cardTitle}>ADD WEBSITE</Text>
                  </>
                ) : (
                  <>
                    <Image
                      source={{
                        uri: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
                          option.url
                        )}`,
                      }}
                      style={styles.favicon}
                    />
                    <Text style={styles.cardTitle}>{option.name}</Text>
                    <Text style={styles.cardDescription}>{option.url}</Text>
                  </>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Note: This feature is designed to support most websites that also support a
          physical gamepad, but individual website performance & compatibility may vary.
        </Text>
      </ScrollView>

      <NewUrlModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(name, url) => {
          handleAddWebsite(name, url);
          setModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  backButton: {
    left: 28,
    position: 'absolute',
    top: 52,
    zIndex: 10,
  },
  scrollContainer: {
    alignItems: 'center',
    flexGrow: 1,
    gap: 48,
    justifyContent: 'flex-start',
    paddingHorizontal: 28,
    paddingTop: 92,
    paddingBottom: 40,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  cards: {
    alignItems: 'center',
    gap: 26,
    width: '100%',
  },
  cardsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
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
  deleteButton: {
    padding: 4,
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  favicon: {
    borderRadius: 8,
    height: 44,
    width: 44,
  },
  cardContent: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  cardDescription: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
  footerNote: {
    color: colors.text,
    opacity: 0.6,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 'auto',
    lineHeight: 18,
  },
});
