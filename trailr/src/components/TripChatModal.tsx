/**
 * Trip chat — a per-trip group thread for collaborators to coordinate plans,
 * assignments, and bookings. Polls every 5s while open (no websockets in stack).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useMessages, useSendMessage, useDeleteMessage } from '@trailr/db';
import type { TripMessageItem } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import { PressableScale } from './PressableScale';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './Toast';

interface Props {
  tripId: string;
  visible: boolean;
  onClose: () => void;
}

/** Short relative time ("now", "5m", "3h", "2d"). */
function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function TripChatModal({ tripId, visible, onClose }: Props) {
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const { data: messages = [], isLoading } = useMessages(visible ? tripId : '', visible);
  const send = useSendMessage(tripId);
  const del = useDeleteMessage(tripId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Keep the newest message in view.
  useEffect(() => {
    if (visible && messages.length) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, visible]);

  const onSend = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    send.mutate(body, { onError: () => { toast('Could not send'); setDraft(body); } });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <PressableScale style={styles.backdrop} onPress={onClose}>
        <PressableScale style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Trip chat</Text>

          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.acc} /></View>
          ) : (
            <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
              {messages.length === 0 && (
                <Text style={styles.muted}>No messages yet. Say hi to your trip companions 👋</Text>
              )}
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  mine={m.author.id === me?.id}
                  onDelete={() => del.mutate(m.id)}
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor={colors.sub}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={onSend}
              returnKeyType="send"
              multiline
            />
            <Btn solid sm onPress={onSend} loading={send.isPending} disabled={!draft.trim()}>Send</Btn>
          </View>
        </PressableScale>
      </PressableScale>
    </Modal>
  );
}

function MessageRow({ message, mine, onDelete }: { message: TripMessageItem; mine: boolean; onDelete: () => void }) {
  const u = message.author;
  return (
    <View style={[styles.msgRow, mine && styles.msgRowMine]}>
      {!mine && <Avatar size={28} imageUri={u.avatar_url} />}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!mine && <Text style={styles.msgAuthor}>{u.display_name ?? u.username}</Text>}
        <Text style={[styles.msgBody, mine && styles.msgBodyMine]}>{message.body}</Text>
        <View style={styles.msgMeta}>
          <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>{ago(message.created_at)}</Text>
          {mine && (
            <PressableScale onPress={onDelete} accessibilityLabel="Delete message">
              <Text style={styles.msgDelete}>✕</Text>
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    maxHeight: '80%',
    gap: spacing.md,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink },
  list: { maxHeight: 420 },
  listContent: { gap: spacing.md, paddingVertical: spacing.xs },
  center: { paddingVertical: 32, alignItems: 'center' },
  muted: { color: colors.sub, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '85%' },
  msgRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  bubbleTheirs: { backgroundColor: colors.panel, borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.acc, borderTopRightRadius: 4 },
  msgAuthor: { fontSize: fontSize.xs, fontWeight: '700', color: colors.sub },
  msgBody: { fontSize: fontSize.md, color: colors.ink, lineHeight: 20 },
  msgBodyMine: { color: colors.white },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-end' },
  msgTime: { fontSize: 10, color: colors.sub },
  msgTimeMine: { color: 'rgba(255,255,255,0.8)' },
  msgDelete: { fontSize: 11, color: 'rgba(255,255,255,0.85)', paddingHorizontal: 2 },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
    textAlignVertical: 'top',
  },
});
