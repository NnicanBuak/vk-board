export interface TagDto {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface TagCreateInput {
  boardId: string;
  name: string;
  color?: string;
}

export interface TagAssignInput {
  cardId: string;
  tagId: string;
}

export interface TagAssignResponse {
  cardId: string;
  tagId: string;
}
