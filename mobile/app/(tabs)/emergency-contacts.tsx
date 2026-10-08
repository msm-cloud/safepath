import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  type ScrollView,
  type TextInput,
  View,
} from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { useInputScroll } from '@/lib/use-input-scroll';
import { isValidPhone } from '@/lib/validation';
import { useTheme } from '@/theme';

type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
};

const AVATAR_SIZE = 40;

// Validation errors sit under the field they are about; a failed save sits
// above the form's button.
type FormError = { field: 'name' | 'phone' | 'form'; message: string };

function fieldError(error: FormError | null, field: FormError['field']): string | undefined {
  return error?.field === field ? error.message : undefined;
}

export default function EmergencyContactsScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const userId = session?.user.id;

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Add-contact form.
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState<FormError | null>(null);
  const [adding, setAdding] = useState(false);

  // Inline edit — at most one row editable at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<FormError | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const newNameInputRef = useRef<TextInput>(null);
  const newPhoneInputRef = useRef<TextInput>(null);
  // Shared by every row's edit form; only one row is ever in edit mode.
  const editNameInputRef = useRef<TextInput>(null);
  const editPhoneInputRef = useRef<TextInput>(null);

  const { onInputFocus, onInputBlur } = useInputScroll(scrollRef);

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

  // The error to show, or null when the pair can be saved.
  const validate = (name: string, phone: string): FormError | null => {
    if (name.trim().length === 0) return { field: 'name', message: t('enterContactName') };
    if (!isValidPhone(phone)) return { field: 'phone', message: t('invalidPhone') };
    return null;
  };

  const handleAdd = async () => {
    const invalid = validate(newName, newPhone);
    setAddError(invalid);
    if (invalid || !userId) return;

    setAdding(true);
    const { error } = await supabase
      .from('emergency_contacts')
      .insert({ user_id: userId, name: newName.trim(), phone: newPhone.trim() });
    setAdding(false);

    if (error) {
      setAddError({ field: 'form', message: t('contactSaveError') });
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
    const invalid = validate(editName, editPhone);
    setEditError(invalid);
    if (invalid) return;

    setSaving(true);
    const { error } = await supabase
      .from('emergency_contacts')
      .update({ name: editName.trim(), phone: editPhone.trim() })
      .eq('id', editingId);
    setSaving(false);

    if (error) {
      setEditError({ field: 'form', message: t('contactSaveError') });
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
    <Screen
      edges={[]}
      scrollRef={scrollRef}
      contentStyle={{ gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* With no contacts, the warning below already says this. */}
      {(loading || contacts.length > 0) && (
        <Text variant="bodySm" color="textMuted">
          {t('emergencyContactsSubtitle')}
        </Text>
      )}
      {listError && <Banner tone="danger" message={listError} />}
      {loading && <ActivityIndicator />}
      {!loading && !listError && contacts.length === 0 && (
        <Banner tone="warning" message={t('noContactsYet')} />
      )}

      {contacts.map((contact) =>
        editingId === contact.id ? (
          <Card key={contact.id} style={{ gap: spacing.md }}>
            <Input
              ref={editNameInputRef}
              label={t('namePlaceholder')}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              value={editName}
              error={fieldError(editError, 'name')}
              onChangeText={setEditName}
              onFocus={() => onInputFocus(editNameInputRef)}
              onBlur={() => onInputBlur(editNameInputRef)}
              onSubmitEditing={() => editPhoneInputRef.current?.focus()}
            />
            <Input
              ref={editPhoneInputRef}
              label={t('phoneLabel')}
              keyboardType="phone-pad"
              autoComplete="tel"
              value={editPhone}
              error={fieldError(editError, 'phone')}
              onChangeText={setEditPhone}
              onFocus={() => onInputFocus(editPhoneInputRef)}
              onBlur={() => onInputBlur(editPhoneInputRef)}
              onSubmitEditing={handleSaveEdit}
            />
            {editError?.field === 'form' && <Banner tone="danger" message={editError.message} />}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title={t('saveButton')}
                variant="primary"
                size="small"
                fullWidth={false}
                loading={saving}
                onPress={handleSaveEdit}
              />
              <Button
                title={t('cancelButton')}
                variant="secondary"
                size="small"
                fullWidth={false}
                disabled={saving}
                onPress={cancelEditing}
              />
            </View>
          </Card>
        ) : (
          <Card key={contact.id} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={contact.name} url={null} size={AVATAR_SIZE} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="body" weight="semibold">
                  {contact.name}
                </Text>
                <Text variant="bodySm" color="textMuted">
                  {contact.phone}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title={t('editButton')}
                variant="secondary"
                size="small"
                fullWidth={false}
                icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                accessibilityLabel={`${t('editButton')}, ${contact.name}`}
                disabled={editingId !== null}
                onPress={() => startEditing(contact)}
              />
              <Button
                title={t('deleteButton')}
                variant="dangerOutline"
                size="small"
                fullWidth={false}
                icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
                accessibilityLabel={`${t('deleteButton')}, ${contact.name}`}
                loading={deletingId === contact.id}
                onPress={() => handleDelete(contact)}
              />
            </View>
          </Card>
        )
      )}

      <Card style={{ gap: spacing.md }}>
        <Input
          ref={newNameInputRef}
          label={t('namePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          value={newName}
          error={fieldError(addError, 'name')}
          onChangeText={setNewName}
          onFocus={() => onInputFocus(newNameInputRef)}
          onBlur={() => onInputBlur(newNameInputRef)}
          onSubmitEditing={() => newPhoneInputRef.current?.focus()}
        />
        <Input
          ref={newPhoneInputRef}
          label={t('phoneLabel')}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={newPhone}
          error={fieldError(addError, 'phone')}
          onChangeText={setNewPhone}
          onFocus={() => onInputFocus(newPhoneInputRef)}
          onBlur={() => onInputBlur(newPhoneInputRef)}
          onSubmitEditing={handleAdd}
        />
        {addError?.field === 'form' && <Banner tone="danger" message={addError.message} />}
        <Button
          title={t('addContactButton')}
          variant="primary"
          icon={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
          loading={adding}
          onPress={handleAdd}
        />
      </Card>
    </Screen>
  );
}
