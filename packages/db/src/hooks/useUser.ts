import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUser,
  fetchUserByUsername,
  fetchUserPosts,
  checkIsFollowing,
  followUser,
  unfollowUser,
  updateUser,
} from '../queries/users';

export const userKeys = {
  detail: (id: string) => ['users', id] as const,
  byUsername: (username: string) => ['users', 'username', username] as const,
  posts: (id: string) => ['users', id, 'posts'] as const,
  isFollowing: (currentId: string, targetId: string) =>
    ['users', 'following', currentId, targetId] as const,
};

/** A user's posts (visited stops) for their profile grid. */
export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: userKeys.posts(userId),
    queryFn: () => fetchUserPosts(userId),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: userKeys.byUsername(username),
    queryFn: () => fetchUserByUsername(username),
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
  });
}

export function useIsFollowing(currentUserId: string, targetUserId: string) {
  return useQuery({
    queryKey: userKeys.isFollowing(currentUserId, targetUserId),
    queryFn: () => checkIsFollowing(currentUserId, targetUserId),
    enabled: !!currentUserId && !!targetUserId && currentUserId !== targetUserId,
    staleTime: 1000 * 60,
  });
}

/** Toggle follow/unfollow with optimistic update. */
export function useToggleFollow(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        await unfollowUser(currentUserId, targetUserId);
      } else {
        await followUser(currentUserId, targetUserId);
      }
      return !isFollowing;
    },
    onMutate: async ({ targetUserId, isFollowing }) => {
      const key = userKeys.isFollowing(currentUserId, targetUserId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, !isFollowing);
      return { previous };
    },
    onError: (_err, { targetUserId }, ctx) => {
      queryClient.setQueryData(userKeys.isFollowing(currentUserId, targetUserId), ctx?.previous);
    },
    onSettled: (_data, _err, { targetUserId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.isFollowing(currentUserId, targetUserId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(targetUserId) });
    },
  });
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof updateUser>[1]) => updateUser(userId, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(userKeys.detail(userId), updated);
    },
  });
}
