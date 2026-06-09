/** Minimal author fields embedded in trip/stop/comment/saved responses. */
export const AUTHOR_SELECT = {
  id: true,
  username: true,
  display_name: true,
  avatar_url: true,
} as const;
