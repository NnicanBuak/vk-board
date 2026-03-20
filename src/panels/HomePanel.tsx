import { useState, useEffect } from "react";
import {
  Panel,
  Button,
  FormItem,
  Input,
  Textarea,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ModalRoot,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
  Tabs,
  TabsItem,
  usePlatform,
} from "@vkontakte/vkui";
import {
  useRouteNavigator,
  useActiveVkuiLocation,
} from "@vkontakte/vk-mini-apps-router";
import {
  Icon24Squareshape3VerticalOutline,
  Icon24BrainOutline,
  Icon24DocumentListOutline,
} from "@vkontakte/icons";
import { useFab } from "../store/fabState";
import { PANELS } from "../router/routes";

import { useBoards } from "../hooks/useBoards";
import { BoardListItem } from "../components/board/BoardListItem";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorPlaceholder } from "../components/common/ErrorPlaceholder";
import { getRecentBoardIds } from "../utils/recentBoards";
import type { Board, BoardType } from "../types/board";

const BOARD_TYPES: { value: BoardType; label: string; desc: string }[] = [
  {
    value: "kanban",
    label: "Канбан",
    desc: "Колонки и задачи с исполнителями и дедлайнами",
  },
  {
    value: "brainstorm",
    label: "Брейншторм",
    desc: "Сетка идей с голосованием, без колонок",
  },
  {
    value: "notes",
    label: "Заметки",
    desc: "Страницы с форматированным текстом, как в Notion",
  },
];

const BOARD_TYPE_ICONS: Record<BoardType, React.ReactNode> = {
  kanban: <Icon24Squareshape3VerticalOutline />,
  brainstorm: <Icon24BrainOutline />,
  notes: <Icon24DocumentListOutline />,
};

const MODAL_CREATE = "create_board";

interface Props {
  id: string;
}

export function HomePanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { panel } = useActiveVkuiLocation();
  const { showFab, hideFab } = useFab();
  const { boards, loading, error, refresh, createBoard } = useBoards();
  const platform = usePlatform();

  const [activeTab, setActiveTab] = useState<"recent" | "mine">("recent");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [boardType, setBoardType] = useState<BoardType>("kanban");
  const [creating, setCreating] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const openCreate = () => {
    setTitle("Новая доска");
    setDescription("");
    setCoverImage("");
    setBoardType("kanban");
    setActiveModal(MODAL_CREATE);
  };

  useEffect(() => {
    if (panel !== PANELS.HOME) return;
    if (activeModal) {
      hideFab();
      return;
    }
    showFab(openCreate);
    // openCreate is recreated on every render — intentional, FAB always gets fresh handler
  }, [panel, activeModal, showFab, hideFab]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard({
        title: title.trim(),
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        boardType,
      });
      setActiveModal(null);
      navigator.push(`/board/${board.id}`);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const openBoard = (boardId: string) => navigator.push(`/board/${boardId}`);

  const myBoards = boards.filter((b) => b.myRole === "admin");

  const recentIds = getRecentBoardIds();
  const recentBoards = recentIds
    .map((rid) => boards.find((b) => b.id === rid))
    .filter((b): b is Board => b !== undefined);
  const unseenBoards = boards.filter((b) => !recentIds.includes(b.id));
  const allRecentBoards = [...recentBoards, ...unseenBoards];

  const tabBoards = activeTab === "mine" ? myBoards : allRecentBoards;

  const newBoardModal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_CREATE}
        dynamicContentHeight
        header={
          <ModalPageHeader
          // before={platform !== "ios" && <PanelHeaderClose onClick={() => setActiveModal(null)} />}
          // after={platform === "ios" && <PanelHeaderClose onClick={() => setActiveModal(null)} />}
          >
            Новая доска
          </ModalPageHeader>
        }
      >
        <ModalPageContent>
          <Box>
            <FormItem top="Название *">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: дорожная карта"
                maxLength={100}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </FormItem>
            <FormItem top="Описание">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Для чего полезна эта доска?"
                maxLength={600}
                rows={2}
              />
            </FormItem>
            <FormItem top="Тип доски">
              <div className="board-type-picker">
                {BOARD_TYPES.map((t) => {
                  const active = boardType === t.value;
                  return (
                    <button
                      key={t.value}
                      className={`board-type-btn${active ? " board-type-btn--active" : ""}`}
                      onClick={() => setBoardType(t.value)}
                    >
                      <span className="board-type-btn__icon">
                        {BOARD_TYPE_ICONS[t.value]}
                      </span>
                      <div className="board-type-btn__text">
                        <div className="board-type-btn__name">{t.label}</div>
                        <div className="board-type-btn__desc">{t.desc}</div>
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
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PullToRefresh onRefresh={refresh} isFetching={loading}>
        {/* Hero section */}
        <div className="hero-bg">
          <div className="hero-orb hero-orb--1" />
          <div className="hero-orb hero-orb--2" />
          <div className="hero-orb hero-orb--3" />
          <div className="hero-orb hero-orb--4" />

          <div className="page-inner hero-bg__content">
            <h1 className="hero__title">Совместные доски</h1>
            <p className="hero__subtitle">
              Коллаборируйтесь с 🫂&nbsp;друзьями 🗣️&nbsp;чатом или
              👥&nbsp;сообществом.
            </p>
          </div>
        </div>

        {error && <ErrorPlaceholder message={error} onRetry={refresh} />}

        {!error && (
          <div className="page-inner">
            {/* Tabs */}
            <Tabs className="home-tabs">
              <TabsItem
                selected={activeTab === "recent"}
                onClick={() => setActiveTab("recent")}
              >
                Недавние
              </TabsItem>
              <TabsItem
                selected={activeTab === "mine"}
                onClick={() => setActiveTab("mine")}
              >
                Мои
              </TabsItem>
            </Tabs>

            {/* Board list */}
            {loading && !boards.length ? (
              <Box
                style={{
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 48,
                }}
              >
                <Spinner size="l" />
              </Box>
            ) : tabBoards.length === 0 ? (
              <EmptyState
                header={
                  activeTab === "mine"
                    ? "Ещё нет своих досок"
                    : "Нет недавних досок"
                }
                text={
                  activeTab === "mine"
                    ? "Нажмите «Создать доску», чтобы начать"
                    : "Откройте доску по ссылке или создайте свою"
                }
                actionLabel="Создать доску"
                onAction={openCreate}
              />
            ) : (
              <div className="board-grid">
                {tabBoards.map((b) => (
                  <BoardListItem
                    key={b.id}
                    board={b}
                    onClick={() => openBoard(b.id)}
                  />
                ))}
              </div>
            )}

            <div style={{ height: 88 }} />
          </div>
        )}
      </PullToRefresh>

      {newBoardModal}

      {snackbar && (
        <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>
      )}
    </Panel>
  );
}
