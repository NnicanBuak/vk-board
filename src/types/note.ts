export interface Note {
  id: string;
  boardId: string;
  parentId: string | null;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
