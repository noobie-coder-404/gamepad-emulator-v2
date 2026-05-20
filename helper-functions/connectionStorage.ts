import AsyncStorage from '@react-native-async-storage/async-storage';

const CONNECTION_STORAGE_KEY = 'rectrix:connection';

export type StoredConnection = {
  ip: string;
  code: string;
  name: string;
};

export async function saveConnection(connection: StoredConnection) {
  await AsyncStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(connection));
}

export async function deleteConnection() {
  await AsyncStorage.removeItem(CONNECTION_STORAGE_KEY);
}

export async function getConnection() {
  const rawConnection = await AsyncStorage.getItem(CONNECTION_STORAGE_KEY);

  if (!rawConnection) {
    return null;
  }

  try {
    const parsedConnection = JSON.parse(rawConnection) as Partial<StoredConnection>;

    if (!parsedConnection.ip || !parsedConnection.code) {
      return null;
    }

    return {
      ip: parsedConnection.ip,
      code: parsedConnection.code,
      name: parsedConnection.name ?? 'Unnamed PC',
    };
  } catch {
    return null;
  }
}
