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

export interface BoardTypeOption {
  value: BoardType;
  label: string;
  desc: string;
}

export const BOARD_TYPE_ICONS: Record<BoardType, BoardTypeIconComponent> = {
  kanban: Icon24Squareshape3VerticalOutline,
  brainstorm: Icon24BrainOutline,
  notes: Icon24DocumentListOutline,
};

export const BOARD_TYPES: BoardTypeOption[] = [
  {
    value: "kanban",
    label: "Канбан",
    desc: "Колонки и задачи",
  },
  {
    value: "brainstorm",
    label: "Брейншторм",
    desc: "Список идей с голосованием",
  },
  {
    value: "notes",
    label: "Заметки",
    desc: "Дневник, Блокнот, База знаний",
  },
];

export const BOARD_TYPE_LABELS: Record<BoardType, string> = BOARD_TYPES.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<BoardType, string>,
);

type BoardTypeTheme = {
  bg: string;
  text: string;
};

export const BOARD_TYPE_THEMES: Record<BoardType, BoardTypeTheme> = {
  kanban: {
    bg: "rgba(18, 49, 175, 0.1)",
    text: "rgb(20, 54, 206)",
  },
  brainstorm: {
    bg: "rgba(132, 18, 189, 0.1)",
    text: "rgb(144, 20, 206)",
  },
  notes: {
    bg: "rgba(193, 196, 21, 0.1)",
    text: "rgb(213, 177, 16)",
  },
};
