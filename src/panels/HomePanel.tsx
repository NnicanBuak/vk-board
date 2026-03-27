import { useState, useEffect } from "react";
import {
  Panel,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ModalRoot,
  Tabs,
  TabsItem,
} from "@vkontakte/vkui";
import {
  useRouteNavigator,
  useActiveVkuiLocation,
} from "@vkontakte/vk-mini-apps-router";
import {
  Icon20Users3Outline,
  Icon20MessageTextOutline,
  Icon20UsersOutline,
} from "@vkontakte/icons";
import { useFab } from "../store/fabState";
import { PANELS } from "../router/routes";
import { useBoards } from "../hooks/useBoards";
import { BoardListItem } from "../components/board/BoardListItem";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorPlaceholder } from "../components/common/ErrorPlaceholder";
import { CreateBoardModal } from "../components/modals/CreateBoardModal";
import { getRecentBoardIds } from "../utils/recentBoards";
import type { Board } from "../types/board";

const HOME_MODAL_IDS = {
  createBoard: "create_board",
} as const;
const TAB_SWITCH_FADE_MS = 140;
const TAB_SWITCH_LOADING_MS = 220;
const TAB_SWITCH_ENTER_MS = 320;
const TAB_LOADING_CARD_COUNT = 4;

type HomeTab = "recent" | "mine";
type HomeModalId = (typeof HOME_MODAL_IDS)[keyof typeof HOME_MODAL_IDS];
type HomeTabTransitionPhase = "idle" | "fade-out" | "loading";
type HomeTabEnterState = "idle" | "prep" | "active";

interface Props {
  id: string;
}

export function HomePanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { panel } = useActiveVkuiLocation();
  const { showFab, hideFab } = useFab();
  const { boards, loading, error, refresh, createBoard } = useBoards();

  const [activeTab, setActiveTab] = useState<HomeTab>("recent");
  const [displayedTab, setDisplayedTab] = useState<HomeTab>("recent");
  const [tabTransitionPhase, setTabTransitionPhase] =
    useState<HomeTabTransitionPhase>("idle");
  const [tabEnterState, setTabEnterState] = useState<HomeTabEnterState>("idle");
  const [tabEnterVersion, setTabEnterVersion] = useState(0);
  const [activeModal, setActiveModal] = useState<HomeModalId | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const closeModal = () => setActiveModal(null);
  const openCreate = () => setActiveModal(HOME_MODAL_IDS.createBoard);

  useEffect(() => {
    if (panel !== PANELS.HOME) return;
    if (activeModal) {
      hideFab();
      return;
    }
    showFab(openCreate);
    // openCreate is recreated on every render — intentional, FAB always gets fresh handler
  }, [panel, activeModal, showFab, hideFab]);

  useEffect(() => {
    if (activeTab === displayedTab) {
      return;
    }

    const switchTimer = window.setTimeout(() => {
      setDisplayedTab(activeTab);
      setTabTransitionPhase("loading");
    }, TAB_SWITCH_FADE_MS);

    const revealTimer = window.setTimeout(() => {
      setTabEnterVersion((current) => current + 1);
      setTabEnterState("prep");
      setTabTransitionPhase("idle");
    }, TAB_SWITCH_FADE_MS + TAB_SWITCH_LOADING_MS);

    return () => {
      window.clearTimeout(switchTimer);
      window.clearTimeout(revealTimer);
    };
  }, [activeTab, displayedTab]);

  useEffect(() => {
    if (tabEnterState !== "prep") {
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;
    let settleTimer = 0;

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        setTabEnterState("active");
        settleTimer = window.setTimeout(() => {
          setTabEnterState("idle");
        }, TAB_SWITCH_ENTER_MS);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(settleTimer);
    };
  }, [tabEnterState, tabEnterVersion]);

  const openBoard = (boardId: string) => navigator.push(`/board/${boardId}`);

  const myBoards = boards;

  const recentIds = getRecentBoardIds();
  const recentBoards = recentIds
    .map((rid) => boards.find((b) => b.id === rid))
    .filter((b): b is Board => b !== undefined);
  const unseenBoards = boards.filter((b) => !recentIds.includes(b.id));
  const allRecentBoards = [...recentBoards, ...unseenBoards];

  const displayedTabBoards =
    displayedTab === "mine" ? myBoards : allRecentBoards;
  const isInitialLoading = loading && !boards.length;
  const isTabSwitchLoading =
    !isInitialLoading && tabTransitionPhase === "loading";
  const tabContentClassName = [
    "home-tab-content",
    tabTransitionPhase !== "idle"
      ? `home-tab-content--${tabTransitionPhase}`
      : "",
    tabEnterState === "prep" ? "home-tab-content--enter-prep" : "",
    tabEnterState === "active" ? "home-tab-content--enter-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleTabChange = (nextTab: HomeTab) => {
    if (nextTab === activeTab) {
      return;
    }

    setTabEnterState("idle");
    setTabTransitionPhase("fade-out");
    setActiveTab(nextTab);
  };

  return (
    <Panel id={id}>
      <PullToRefresh onRefresh={refresh} isFetching={loading}>
        {/* Hero section */}
        <div className="hero-bg">
          <div className="hero-wave hero-wave--1" />
          <div className="hero-wave hero-wave--2" />
          <div className="hero-wave hero-wave--3" />
          <div className="hero-wave hero-wave--4" />
          <div className="hero-ball-orbit hero-ball-orbit--1">
            <div className="hero-ball hero-ball--1" />
          </div>
          <div className="hero-ball-orbit hero-ball-orbit--2">
            <div className="hero-ball hero-ball--2" />
          </div>
          <div className="hero-ball-orbit hero-ball-orbit--3">
            <div className="hero-ball hero-ball--3" />
          </div>
          <div className="hero-ball-orbit hero-ball-orbit--4">
            <div className="hero-ball hero-ball--4" />
          </div>

          <div className="page-inner hero-bg__content">
            <div className="hero__title">Коллабо
            </div>
            <p className="hero__subtitle">
              Коллаборируйтесь с <br />
              <Icon20UsersOutline
                className="hero__subtitle-icon"
                aria-hidden
              />
              &nbsp;друзьями <br />
              <Icon20MessageTextOutline
                className="hero__subtitle-icon"
                aria-hidden
              />
              &nbsp;чатами<br />
              <Icon20Users3Outline
                className="hero__subtitle-icon"
                aria-hidden
              />
              &nbsp;сообществами
            </p>
          </div>
        </div>

        {error && <ErrorPlaceholder message={error} onRetry={refresh} />}

        {!error && (
          <div className="page-inner">
            {/* Tabs */}
            <Tabs
              mode="secondary"
              layoutFillMode="auto"
              className="home-tabs"
            >
              <TabsItem
                selected={activeTab === "recent"}
                onClick={() => handleTabChange("recent")}
                hoverMode=""
                activeMode=""
                hasHover={false}
                hasActive={false}
              >
                Недавние
              </TabsItem>
              <TabsItem
                selected={activeTab === "mine"}
                onClick={() => handleTabChange("mine")}
                hoverMode=""
                activeMode=""
                hasHover={false}
                hasActive={false}
              >
                Мои
              </TabsItem>
            </Tabs>

            {/* Board list */}
            <div className={tabContentClassName}>
              {isInitialLoading ? (
                <Box
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 48,
                  }}
                >
                  <Spinner size="l" />
                </Box>
              ) : isTabSwitchLoading ? (
                <div
                  className="board-grid board-grid--loading"
                  aria-label="Загрузка досок"
                >
                  {Array.from({ length: TAB_LOADING_CARD_COUNT }, (_, index) => (
                    <div
                      key={`tab-skeleton-${displayedTab}-${index}`}
                      className="board-card board-card--skeleton"
                      aria-hidden="true"
                    >
                      <div className="board-card__preview" />
                      <div className="board-card__body">
                        <div className="board-card__skeleton-line board-card__skeleton-line--title" />
                        <div className="board-card__skeleton-line" />
                        <div className="board-card__skeleton-line board-card__skeleton-line--short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedTabBoards.length === 0 ? (
                <EmptyState
                  header={
                    displayedTab === "mine"
                      ? "Ещё нет своих досок"
                      : "Нет недавних досок"
                  }
                  text={
                    displayedTab === "mine"
                      ? "Нажмите «Создать доску», чтобы начать"
                      : "Откройте доску по ссылке или создайте свою"
                  }
                  actionLabel="Создать доску"
                  onAction={openCreate}
                />
              ) : (
                <div className="board-grid">
                  {displayedTabBoards.map((b) => (
                    <BoardListItem
                      key={b.id}
                      board={b}
                      onClick={() => openBoard(b.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: 88 }} />
          </div>
        )}
      </PullToRefresh>

      <ModalRoot activeModal={activeModal} onClose={closeModal}>
        <CreateBoardModal
          id={HOME_MODAL_IDS.createBoard}
          open={activeModal === HOME_MODAL_IDS.createBoard}
          onClose={closeModal}
          onCreate={createBoard}
          onCreated={(board) => navigator.push(`/board/${board.id}`)}
          onError={setSnackbar}
        />
      </ModalRoot>

      {snackbar && (
        <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>
      )}
    </Panel>
  );
}
