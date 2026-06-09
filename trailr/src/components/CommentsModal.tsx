import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useComments, useAddComment, useDeleteComment } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import { useAuthStore } from '../stores/authStore';

interface Props {
  stopId: string | null;
  visible: boolean;
  onClose: () => void;
}

export function CommentsModal({ stopId, visible, onClose }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const id = stopId ?? '';
  const { data: comments = [], isLoading } = useComments(id, visible && !!stopId);
  const add = useAddComment(id);
  const del = useDeleteComment(id);
  const [text, setText] = useState('');

  const submit = () => {
    if (!user) {
      onClose();
      router.push('/sign-in');
      return;
    }
    const content = text.trim();
    if (!content) return;
    add.mutate(content, { onSuccess: () => setText('') });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.title}>Comments</Text>

          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.acc} /></View>
          ) : comments.length === 0 ? (
            <View style={styles.center}><Text style={styles.empty}>No comments yet. Be the first.</Text></View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.md }}>
              {comments.map((c) => (
                <View key={c.id} style={styles.row}>
                  <Avatar size={32} imageUri={c.author.avatar_url} />
                  <View style={styles.rowBody}>
                    <Text style={styles.handle2}>@{c.author.username}</Text>
                    <Text style={styles.content}>{c.content}</Text>
                  </View>
                  {user?.id === c.author.id && (
                    <TouchableOpacity onPress={() => del.mutate(c.id)}>
                      <Text style={styles.delete}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
              placeholderTextColor={colors.sub}
              value={text}
              onChangeText={setText}
              onSubmitEditing={submit}
              editable={!!user}
            />
            <Btn solid sm onPress={submit}>{add.isPending ? '…' : 'Post'}</Btn>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    maxHeight: '70%',
    gap: spacing.md,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink },
  center: { paddingVertical: 40, alignItems: 'center' },
  empty: { color: colors.sub, fontSize: fontSize.md },
  list: { maxHeight: 360 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowBody: { flex: 1, gap: 2 },
  handle2: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  content: { fontSize: fontSize.md, color: colors.ink, lineHeight: 20 },
  delete: { color: colors.sub, fontSize: fontSize.sm, paddingHorizontal: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
});
