export interface NoteDto {
  id: string;
  boardId: string;
  parentId: string | null;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreateInput {
  title: string;
  parentId?: string;
  content?: string;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  order?: number;
  parentId?: string | null;
}
