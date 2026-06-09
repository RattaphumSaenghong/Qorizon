/**
 * Trip collaborators — invite people you follow, see who's on the trip,
 * and open a member's info (real name / phone, visible to co-members).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import {
  useTripMembers,
  useFollowing,
  useInviteMember,
  useRemoveMember,
  useUser,
} from '@trailr/db';
import type { TripMemberItem } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import { Chip } from './Chip';
import { PressableScale } from './PressableScale';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './Toast';

interface Props {
  tripId: string;
  isOwner: boolean;
  visible: boolean;
  onClose: () => void;
}

export function TripMembersModal({ tripId, isOwner, visible, onClose }: Props) {
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const { data: members = [], isLoading } = useTripMembers(visible ? tripId : '');
  const { data: following = [] } = useFollowing(visible && isOwner ? me?.id ?? '' : '');
  const invite = useInviteMember(tripId);
  const remove = useRemoveMember(tripId);
  const [infoUserId, setInfoUserId] = useState<string | null>(null);

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const invitable = following.filter((u) => !memberUserIds.has(u.id) && u.id !== me?.id);

  const onInvite = (userId: string, name: string) =>
    invite.mutate(userId, {
      onSuccess: () => toast(`Invited ${name}`),
      onError: () => toast('Could not invite'),
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <PressableScale style={styles.backdrop} onPress={onClose}>
        <PressableScale style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          {infoUserId ? (
            <UserInfo userId={infoUserId} onBack={() => setInfoUserId(null)} />
          ) : (
            <>
              <Text style={styles.title}>Trip companions</Text>
              {isLoading ? (
                <View style={styles.center}><ActivityIndicator color={colors.acc} /></View>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
                  <Text style={styles.section}>On this trip</Text>
                  {members.length === 0 && <Text style={styles.muted}>Just you so far.</Text>}
                  {members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      canRemove={isOwner}
                      onInfo={() => setInfoUserId(m.user_id)}
                      onRemove={() =>
                        remove.mutate(m.user_id, { onSuccess: () => toast('Removed') })
                      }
                    />
                  ))}

                  {isOwner && (
                    <>
                      <Text style={[styles.section, { marginTop: spacing.lg }]}>Invite people you follow</Text>
                      {invitable.length === 0 && (
                        <Text style={styles.muted}>No one left to invite. Follow more travelers to add them.</Text>
                      )}
                      {invitable.map((u) => (
                        <View key={u.id} style={styles.row}>
                          <Avatar size={36} imageUri={u.avatar_url} />
                          <View style={styles.rowBody}>
                            <Text style={styles.name}>{u.display_name ?? u.username}</Text>
                            <Text style={styles.handle}>@{u.username}</Text>
                          </View>
                          <Btn sm onPress={() => onInvite(u.id, u.display_name ?? u.username)}>Invite</Btn>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              )}
            </>
          )}
        </PressableScale>
      </PressableScale>
    </Modal>
  );
}

function MemberRow({
  member,
  canRemove,
  onInfo,
  onRemove,
}: {
  member: TripMemberItem;
  canRemove: boolean;
  onInfo: () => void;
  onRemove: () => void;
}) {
  const u = member.user;
  return (
    <View style={styles.row}>
      <Avatar size={36} imageUri={u.avatar_url} />
      <View style={styles.rowBody}>
        <Text style={styles.name}>{u.display_name ?? u.username}</Text>
        <Text style={styles.handle}>@{u.username}</Text>
      </View>
      {member.status === 'pending' && <Chip dot={false} style={styles.pending}>pending</Chip>}
      <PressableScale onPress={onInfo} accessibilityLabel="View info"><Text style={styles.infoBtn}>ⓘ</Text></PressableScale>
      {canRemove && (
        <PressableScale onPress={onRemove} accessibilityLabel="Remove"><Text style={styles.removeBtn}>✕</Text></PressableScale>
      )}
    </View>
  );
}

function UserInfo({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { data: user, isLoading } = useUser(userId);
  return (
    <View style={{ gap: spacing.md }}>
      <PressableScale onPress={onBack}><Text style={styles.back}>‹ back</Text></PressableScale>
      {isLoading || !user ? (
        <View style={styles.center}><ActivityIndicator color={colors.acc} /></View>
      ) : (
        <View style={styles.infoCard}>
          <Avatar size={72} ring imageUri={user.avatar_url} />
          <Text style={styles.infoName}>{user.real_name ?? user.display_name ?? user.username}</Text>
          <Text style={styles.handle}>@{user.username}</Text>
          {user.bio ? <Text style={styles.infoBio}>{user.bio}</Text> : null}
          <View style={styles.infoFields}>
            <InfoField label="Real name" value={user.real_name} />
            <InfoField label="Phone" value={user.phone} fallback="Hidden — shared only with trip companions" />
          </View>
        </View>
      )}
    </View>
  );
}

function InfoField({ label, value, fallback }: { label: string; value: string | null; fallback?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, !value && styles.fieldMuted]}>{value ?? fallback ?? '—'}</Text>
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
  section: { fontSize: fontSize.sm, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { maxHeight: 420 },
  center: { paddingVertical: 32, alignItems: 'center' },
  muted: { color: colors.sub, fontSize: fontSize.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBody: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.ink },
  handle: { fontSize: fontSize.sm, color: colors.sub },
  pending: { marginRight: 4 },
  infoBtn: { fontSize: 18, color: colors.acc, paddingHorizontal: 6 },
  removeBtn: { fontSize: fontSize.md, color: colors.sub, paddingHorizontal: 6 },
  back: { fontSize: fontSize.sm, color: colors.sub },
  infoCard: { alignItems: 'center', gap: 6 },
  infoName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink, marginTop: spacing.sm },
  infoBio: { fontSize: fontSize.sm, color: colors.ink, textAlign: 'center', marginTop: 4 },
  infoFields: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  field: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
  fieldLabel: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '600' },
  fieldValue: { fontSize: fontSize.md, color: colors.ink },
  fieldMuted: { color: colors.sub, fontStyle: 'italic', fontSize: fontSize.sm },
});
