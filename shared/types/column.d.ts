export interface ColumnDto {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: string;
}

export interface ColumnCreateInput {
  boardId: string;
  title: string;
}

export interface ColumnUpdateInput {
  title?: string;
  order?: number;
}
