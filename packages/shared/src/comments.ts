import type { Author } from './trips';

export interface CommentItem {
  id: string;
  stop_id: string;
  content: string;
  created_at: string;
  author: Author;
}

export interface CreateCommentRequest {
  content: string;
}
