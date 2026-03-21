import type { ComponentType } from "react";
import {
  Icon24Squareshape3VerticalOutline,
  Icon24BrainOutline,
  Icon24DocumentListOutline,
} from "@vkontakte/icons";
import type { BoardType } from "../types/board";

export type BoardTypeIconComponent = ComponentType<{
  className?: string;
  width?: number;
  height?: number;
  "aria-hidden"?: boolean;
}>;

export const BOARD_TYPE_ICONS: Record<BoardType, BoardTypeIconComponent> = {
  kanban: Icon24Squareshape3VerticalOutline,
  brainstorm: Icon24BrainOutline,
  notes: Icon24DocumentListOutline,
};

export interface BoardTypeOption {
  value: BoardType;
  label: string;
  desc: string;
  color: string;
}

export const BOARD_TYPES: BoardTypeOption[] = [
  {
    value: "kanban",
    label: "Канбан",
    desc: "Колонки и задачи",
    color: "#4f71ff",
  },
  {
    value: "brainstorm",
    label: "Брейншторм",
    desc: "Список идей с голосованием",
    color: "#c146ff",
  },
  {
    value: "notes",
    label: "Заметки",
    desc: "Дневник, Блокнот, База знаний",
    color: "#1fbfa6",
  },
];

export const BOARD_TYPE_LABELS: Record<BoardType, string> =
  BOARD_TYPES.reduce(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {} as Record<BoardType, string>
  );

type BoardTypeTheme = {
  bg: string;
  text: string;
};

export const BOARD_TYPE_THEMES: Record<BoardType, BoardTypeTheme> = {
  kanban: {
    bg: "rgba(79, 113, 255, 0.15)",
    text: "#2f4cc9",
  },
  brainstorm: {
    bg: "rgba(193, 70, 255, 0.16)",
    text: "#7d2aa8",
  },
  notes: {
    bg: "rgba(31, 191, 166, 0.18)",
    text: "#0f7b68",
  },
};
