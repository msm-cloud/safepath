import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView, type ScrollResponderHandle } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { isValidPhone } from '@/lib/validation';

type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
};

export default function EmergencyContactsScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session?.user.id;

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Add-contact form.
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Inline edit — at most one row editable at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // FlatList's own ref type doesn't expose scrollResponderScrollNative-
  // HandleToKeyboard directly — only getScrollResponder(), which the .d.ts
  // types as a bare JSX.Element (a known lag behind the actual Flow types;
  // see node_modules/react-native/Libraries/Lists/FlatList.js, which
  // returns the real underlying ScrollView's imperative handle at
  // runtime) — hence the cast in scrollFormInputIntoView below.
  const flatListRef = useRef<FlatList>(null);
  const newNameInputRef = useRef<TextInput>(null);
  const newPhoneInputRef = useRef<TextInput>(null);
  // Shared by every row's inline edit form — safe because at most one row
  // is ever in edit mode at a time (see editingId above).
  const editNameInputRef = useRef<TextInput>(null);
  const editPhoneInputRef = useRef<TextInput>(null);

  const scrollFormInputIntoView = useCallback((inputRef: RefObject<TextInput | null>) => {
    const scrollResponder = flatListRef.current?.getScrollResponder() as
      ScrollResponderHandle | null | undefined;
    scrollInputIntoView(scrollResponder, inputRef);
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      setListError(error.message);
      return;
    }
    setListError(null);
    setContacts(data ?? []);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same fetch-on-mount pattern as the Guardians tab; see its comment for why this is deliberate.
    fetchContacts().finally(() => setLoading(false));
  }, [fetchContacts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    setAddError(null);

    const trimmedName = newName.trim();
    if (trimmedName.length === 0) {
      setAddError(t('enterYourName'));
      return;
    }
    if (!isValidPhone(newPhone)) {
      setAddError(t('invalidPhone'));
      return;
    }
    if (!userId) return;

    setAdding(true);
    const { error } = await supabase
      .from('emergency_contacts')
      .insert({ user_id: userId, name: trimmedName, phone: newPhone.trim() });
    setAdding(false);

    if (error) {
      setAddError(t('contactSaveError'));
      return;
    }

    setNewName('');
    setNewPhone('');
    await fetchContacts();
  };

  const startEditing = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setEditError(null);

    const trimmedName = editName.trim();
    if (trimmedName.length === 0) {
      setEditError(t('enterYourName'));
      return;
    }
    if (!isValidPhone(editPhone)) {
      setEditError(t('invalidPhone'));
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('emergency_contacts')
      .update({ name: trimmedName, phone: editPhone.trim() })
      .eq('id', editingId);
    setSaving(false);

    if (error) {
      setEditError(t('contactSaveError'));
      return;
    }

    setEditingId(null);
    await fetchContacts();
  };

  const handleDelete = (contact: EmergencyContact) => {
    Alert.alert(t('deleteContactConfirmTitle'), t('deleteContactConfirmMessage'), [
      { text: t('cancelButton'), style: 'cancel' },
      {
        text: t('deleteButton'),
        style: 'destructive',
        onPress: async () => {
          setDeletingId(contact.id);
          const { error } = await supabase.from('emergency_contacts').delete().eq('id', contact.id);
          setDeletingId(null);

          if (error) {
            setListError(t('contactDeleteError'));
            return;
          }
          setContacts((prev) => prev.filter((c) => c.id !== contact.id));
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={contacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>{t('emergencyContactsTitle')}</Text>
              <Text style={styles.subtitle}>{t('emergencyContactsSubtitle')}</Text>

              <View style={styles.addForm}>
                <TextInput
                  ref={newNameInputRef}
                  style={styles.input}
                  placeholder={t('namePlaceholder')}
                  autoCapitalize="words"
                  value={newName}
                  onChangeText={setNewName}
                  onFocus={() => scrollFormInputIntoView(newNameInputRef)}
                />
                <TextInput
                  ref={newPhoneInputRef}
                  style={styles.input}
                  placeholder={t('phonePlaceholder')}
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  onFocus={() => scrollFormInputIntoView(newPhoneInputRef)}
                />
                {addError && <Text style={styles.error}>{addError}</Text>}
                <Pressable
                  style={[styles.button, adding && styles.buttonDisabled]}
                  onPress={handleAdd}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('addContactButton')}</Text>
                  )}
                </Pressable>
              </View>

              {listError && <Text style={styles.error}>{listError}</Text>}
              {loading && <ActivityIndicator style={styles.loadingIndicator} />}
              {!loading && contacts.length === 0 && (
                <Text style={styles.emptyState}>{t('noContactsYet')}</Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            if (editingId === item.id) {
              return (
                <View style={styles.contactRow}>
                  <TextInput
                    ref={editNameInputRef}
                    style={styles.input}
                    placeholder={t('namePlaceholder')}
                    autoCapitalize="words"
                    value={editName}
                    onChangeText={setEditName}
                    onFocus={() => scrollFormInputIntoView(editNameInputRef)}
                  />
                  <TextInput
                    ref={editPhoneInputRef}
                    style={styles.input}
                    placeholder={t('phonePlaceholder')}
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    onFocus={() => scrollFormInputIntoView(editPhoneInputRef)}
                  />
                  {editError && <Text style={styles.error}>{editError}</Text>}
                  <View style={styles.rowActions}>
                    <Pressable
                      style={[styles.smallButton, saving && styles.buttonDisabled]}
                      onPress={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.smallButtonText}>{t('saveButton')}</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.smallButtonSecondary} onPress={cancelEditing}>
                      <Text style={styles.smallButtonSecondaryText}>{t('cancelButton')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.contactRow}>
                <View style={styles.contactRowText}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable style={styles.smallButtonSecondary} onPress={() => startEditing(item)}>
                    <Text style={styles.smallButtonSecondaryText}>{t('editButton')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallButtonDanger}
                    onPress={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.smallButtonText}>{t('deleteButton')}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  addForm: {
    marginTop: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: '#d33',
    fontSize: 13,
  },
  loadingIndicator: {
    marginTop: 12,
  },
  emptyState: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  contactRowText: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  smallButtonDanger: {
    backgroundColor: '#d33',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  smallButtonSecondary: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  smallButtonSecondaryText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
});
