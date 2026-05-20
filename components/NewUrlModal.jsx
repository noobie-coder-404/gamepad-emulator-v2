import colors from '@/assets/images/colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function NewUrlModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (onAdd) {
      onAdd(name, url);
      // Optional: clear fields after adding
      setName('');
      setUrl('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <MaterialCommunityIcons
            name="web"
            size={64}
            color={colors.accent}
            style={styles.icon}
          />

          <Text style={styles.title}>Add New Website</Text>

          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Gamepad Tester)"
            placeholderTextColor="#8d8995"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="URL (e.g. https://...)"
            placeholderTextColor="#8d8995"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.addButton]} onPress={handleAdd}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#8d8995',
    borderRadius: 34,
    borderWidth: 1.5,
    maxWidth: 400,
    padding: 28,
    width: '85%',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#111920',
    borderColor: '#3a4a5a',
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginTop: 12,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: '#111920',
    borderColor: '#3a4a5a',
    borderWidth: 1,
  },
  addButton: {
    backgroundColor: colors.accent,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  addButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
});
