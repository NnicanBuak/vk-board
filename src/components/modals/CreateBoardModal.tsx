import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  FormItem,
  Input,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  Textarea,
} from "@vkontakte/vkui";
import { BOARD_TYPES, BOARD_TYPE_ICONS } from "../../constants/boardTypes";
import type { Board, BoardType } from "../../types/board";

const DEFAULT_BOARD_TITLE = "Новая доска";
const DEFAULT_BOARD_TYPE: BoardType = "kanban";

interface CreateBoardData {
  title: string;
  description?: string;
  coverImage?: string;
  boardType: BoardType;
}

interface CreateBoardModalProps {
  id: string;
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateBoardData) => Promise<Board>;
  onCreated: (board: Board) => void;
  onError: (message: string) => void;
}

export function CreateBoardModal({
  id,
  open,
  onClose,
  onCreate,
  onCreated,
  onError,
}: CreateBoardModalProps) {
  const [title, setTitle] = useState(DEFAULT_BOARD_TITLE);
  const [description, setDescription] = useState("");
  const [boardType, setBoardType] = useState<BoardType>(DEFAULT_BOARD_TYPE);
  const [creating, setCreating] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(DEFAULT_BOARD_TITLE);
    setDescription("");
    setBoardType(DEFAULT_BOARD_TYPE);
    setCreating(false);

    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus({ preventScroll: true });
      titleInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || creating) {
      return;
    }

    setCreating(true);

    try {
      const board = await onCreate({
        title: trimmedTitle,
        description: description.trim() || undefined,
        coverImage: undefined,
        boardType,
      });
      onClose();
      onCreated(board);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalPage
      id={id}
      dynamicContentHeight
      header={<ModalPageHeader>Новая доска</ModalPageHeader>}
    >
      <ModalPageContent>
        <Box>
          <FormItem top="Название *">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: дорожная карта"
              maxLength={100}
              getRef={titleInputRef}
              onFocus={(event) => event.target.select()}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Для чего полезна эта доска?"
              maxLength={600}
              rows={2}
            />
          </FormItem>
          <FormItem top="Тип доски">
            <div className="board-type-picker">
              {BOARD_TYPES.map((boardTypeOption) => {
                const active = boardType === boardTypeOption.value;
                const BoardTypeIcon =
                  BOARD_TYPE_ICONS[boardTypeOption.value];

                return (
                  <button
                    key={boardTypeOption.value}
                    type="button"
                    className={`board-type-btn${active ? " board-type-btn--active" : ""}`}
                    onClick={() => setBoardType(boardTypeOption.value)}
                  >
                    <span className="board-type-btn__icon" aria-hidden="true">
                      <BoardTypeIcon />
                    </span>
                    <div className="board-type-btn__text">
                      <div className="board-type-btn__name">
                        {boardTypeOption.label}
                      </div>
                      <div className="board-type-btn__desc">
                        {boardTypeOption.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={handleCreate}
              disabled={!title.trim() || creating}
              loading={creating}
            >
              Создать доску
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>
  );
}
