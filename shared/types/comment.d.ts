export interface CommentDto {
  id: string;
  cardId: string;
  userId: number;
  text: string;
  createdAt: string;
}

export interface CommentCreateInput {
  cardId: string;
  text: string;
}
