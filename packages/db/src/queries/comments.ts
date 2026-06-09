import { request } from '../http';
import type { CommentItem } from '../types';

export async function fetchComments(stopId: string): Promise<CommentItem[]> {
  return request<CommentItem[]>('GET', `/stops/${stopId}/comments`);
}

export async function addComment(stopId: string, content: string): Promise<CommentItem> {
  return request<CommentItem>('POST', `/stops/${stopId}/comments`, { content });
}

export async function deleteComment(commentId: string): Promise<void> {
  await request<void>('DELETE', `/comments/${commentId}`);
}
