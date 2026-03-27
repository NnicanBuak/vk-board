import { useState, useEffect, useMemo } from 'react';
import bridge from '@vkontakte/vk-bridge';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Spinner,
  Snackbar,
  Group,
  Header,
  Cell,
  Avatar,
  CustomSelect,
  Button,
  Div,
  ModalRoot,
  SegmentedControl,
} from '@vkontakte/vkui';
import { Icon28UserAddOutline } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { boardsApi } from '../api/boards';
import {
  BoardPeoplePickerModal,
  type VKPerson,
} from '../components/modals/BoardPeoplePickerModal';
import { useBoardDetail } from '../hooks/useBoardDetail';
import { useUser } from '../store/userState';
import type { BoardVisibility } from '../types/board';
import type { BoardMemberDto, BoardRole } from '../../shared/types/board';
import { resolveVKGroupId } from '../bridge/vkGroupId';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID ?? 0);

const ROLE_LABELS: Record<BoardRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  editor: 'Редактор',
  viewer: 'Читатель',
};

const ASSIGNABLE_ROLES: Array<{ value: Extract<BoardRole, 'editor' | 'viewer'>; label: string }> = [
  { value: 'editor', label: 'Редактор' },
  { value: 'viewer', label: 'Читатель' },
];

const BOARD_ACCESS_MODAL_IDS = {
  peoplePicker: 'people_picker',
} as const;

type BoardAccessModalId =
  (typeof BOARD_ACCESS_MODAL_IDS)[keyof typeof BOARD_ACCESS_MODAL_IDS];

interface Props { id: string }

export function BoardAccessPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();
  const boardId = params?.boardId ?? '';
  const { user } = useUser();

  const { board, updateBoard } = useBoardDetail(boardId);

  // Local visibility state — avoids dependency on server response having the field.
  const [visibility, setVisibility] = useState<BoardVisibility>('private');
  useEffect(() => { if (board?.visibility) setVisibility(board.visibility); }, [board?.visibility]);

  const [members, setMembers] = useState<BoardMemberDto[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);

  // People picker state
  const [activeModal, setActiveModal] = useState<BoardAccessModalId | null>(null);
  const [candidates, setCandidates] = useState<VKPerson[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [inviteRole, setInviteRole] = useState<Extract<BoardRole, 'editor' | 'viewer'>>('editor');
  const [inviting, setInviting] = useState(false);
  const [communityGroupId, setCommunityGroupId] = useState<number | null>(null);

  const isOwner = board?.myRole === 'owner';
  const isAdmin = board?.myRole === 'admin';
  const canManageAccess = isOwner || isAdmin;
  const canManageVisibility = isOwner;

  // Board context: chat / community / personal
  const boardContext = board
    ? board.chatId ? 'chat'
    : communityGroupId ? 'community'
    : 'personal'
    : null;

  useEffect(() => {
    if (board?.chatId) {
      setCommunityGroupId(null);
      return;
    }

    let cancelled = false;
    resolveVKGroupId()
      .then((groupId) => {
        if (!cancelled) {
          setCommunityGroupId(groupId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunityGroupId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [board?.chatId]);

  useEffect(() => {
    if (!boardId) return;
    boardsApi.members(boardId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [boardId]);

  // Fetch candidate list from VK Bridge
  const loadCandidates = async () => {
    setLoadingCandidates(true);
    setCandidatesError(null);
    setCandidates([]);
    setSearch('');
    setSelectedIds([]);

    try {
      if (boardContext === 'personal') {
        // Friends list — no extra permissions needed
        const res = await bridge.send('VKWebAppGetFriends', { multi: true });
        const people: VKPerson[] = (res.users ?? []).map((u: {
          id: number; first_name: string; last_name: string; photo_200?: string;
        }) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          photo: u.photo_200 ?? '',
        }));
        setCandidates(people);
      } else if (boardContext === 'chat' && board?.chatId) {
        // Chat members — needs messages scope
        const auth = await bridge.send('VKWebAppGetAuthToken', {
          app_id: VK_APP_ID,
          scope: 'messages',
        });
        const chatId = Number(board.chatId);
        const res = await bridge.send('VKWebAppCallAPIMethod', {
          method: 'messages.getConversationMembers',
          params: {
            peer_id: 2_000_000_000 + chatId,
            fields: 'photo_100,first_name,last_name',
            access_token: auth.access_token,
            v: '5.131',
          },
        });
        const profiles: { id: number; first_name: string; last_name: string; photo_100?: string }[] =
          res.response?.profiles ?? [];
        setCandidates(profiles.map((u) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          photo: u.photo_100 ?? '',
        })));
      } else if (boardContext === 'community' && communityGroupId) {
        // Community members — needs groups scope
        const auth = await bridge.send('VKWebAppGetAuthToken', {
          app_id: VK_APP_ID,
          scope: 'groups',
        });
        const res = await bridge.send('VKWebAppCallAPIMethod', {
          method: 'groups.getMembers',
          params: {
            group_id: communityGroupId,
            fields: 'photo_100,first_name,last_name',
            count: 100,
            access_token: auth.access_token,
            v: '5.131',
          },
        });
        const items: { id: number; first_name: string; last_name: string; photo_100?: string }[] =
          res.response?.items ?? [];
        setCandidates(items.map((u) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          photo: u.photo_100 ?? '',
        })));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load members list', error);
      }
      setCandidatesError('Не удалось загрузить список. Проверьте разрешения или попробуйте снова.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openPicker = async () => {
    setActiveModal(BOARD_ACCESS_MODAL_IDS.peoplePicker);
    await loadCandidates();
  };

  const filtered = useMemo(() => {
    const existingIds = new Set(members.map((m) => m.userId));
    return candidates
      .filter((c) => !existingIds.has(c.id))
      .filter((c) => {
        const q = search.toLowerCase();
        return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
      });
  }, [candidates, search, members]);

  const toggleSelect = (uid: number) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleInviteSelected = async () => {
    if (!selectedIds.length) return;
    setInviting(true);
    try {
      const added: BoardMemberDto[] = [];
      for (const uid of selectedIds) {
        const member = await boardsApi.addMember(boardId, uid, inviteRole);
        added.push(member);
      }
      setMembers((prev) => {
        const map = new Map(prev.map((m) => [m.userId, m]));
        added.forEach((m) => map.set(m.userId, m));
        return Array.from(map.values());
      });
      setActiveModal(null);
      setSelectedIds([]);
      setSnackbar(`Добавлено: ${added.length}`);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleVisibilityToggle = async (v: BoardVisibility) => {
    if (savingVisibility) return;
    setVisibility(v); // immediate local update
    setSavingVisibility(true);
    try {
      await updateBoard({ visibility: v } as Parameters<typeof updateBoard>[0]);
    } catch (e) {
      setVisibility(v === 'public' ? 'private' : 'public'); // revert on error
      setSnackbar((e as Error).message);
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleRoleChange = async (userId: number, role: BoardRole) => {
    try {
      const updated = await boardsApi.updateMember(boardId, userId, role);
      setMembers((prev) => prev.map((m) => m.userId === userId ? updated : m));
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await boardsApi.removeMember(boardId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const pickerLabel = boardContext === 'chat' ? 'участников чата'
    : boardContext === 'community' ? 'участников сообщества'
    : 'друзей';
  const pickerTitle = boardContext === 'chat'
    ? 'Участники чата'
    : boardContext === 'community'
      ? 'Участники сообщества'
      : 'Друзья';
  const closeModal = () => setActiveModal(null);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => navigator.back()} />}>
        Доступ
      </PanelHeader>

      {/* Visibility */}
      <Group header={<Header size="s">Видимость доски</Header>}>
        <Div>
          <SegmentedControl
            className="board-access-segmented"
            size="m"
            value={visibility}
            onChange={(v) => canManageVisibility && handleVisibilityToggle(v as BoardVisibility)}
            options={[
              { label: '🌐 По ссылке', value: 'public' },
              { label: '🔒 Приватная', value: 'private' },
            ]}
          />
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>
            {visibility === 'public'
              ? 'Любой с ссылкой может посмотреть'
              : 'Только приглашённые участники'}
          </div>
        </Div>
      </Group>

      {/* Members */}
      <Group header={<Header size="s" after={loadingMembers ? <Spinner size="s" /> : null}>
        Участники ({members.length})
      </Header>}>
        {members.map((m) => {
          const isMe = m.userId === user?.userId;
          const isProtected = m.role === 'owner' || isMe;
          const canChangeRole = canManageAccess && !isProtected && boardContext !== 'personal';
          return (
            <Cell
              key={m.userId}
              before={<Avatar size={40}>{String(m.userId).slice(-2)}</Avatar>}
              subtitle={
                canChangeRole ? (
                  <CustomSelect
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value as BoardRole)}
                    options={ASSIGNABLE_ROLES}
                    style={{ marginTop: 4, minWidth: 150 }}
                  />
                ) : (
                  ROLE_LABELS[m.role] ?? m.role
                )
              }
              after={
                canManageAccess && !isProtected ? (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vkui--color_text_negative)', fontSize: 18, padding: '0 4px' }}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                ) : null
              }
            >
              {isMe ? 'Вы' : `ID ${m.userId}`}
            </Cell>
          );
        })}
      </Group>

      {/* Invite button */}
      {canManageAccess && (
        <Group header={<Header size="s">Пригласить</Header>}>
          <Div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CustomSelect
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Extract<BoardRole, 'editor' | 'viewer'>)}
              options={ASSIGNABLE_ROLES}
              style={{ flex: 1 }}
            />
            <Button
              size="l"
              before={<Icon28UserAddOutline width={20} height={20} />}
              onClick={openPicker}
            >
              Выбрать из {pickerLabel}
            </Button>
          </Div>
        </Group>
      )}

      {/* People picker modal */}
      <ModalRoot activeModal={activeModal} onClose={closeModal}>
        <BoardPeoplePickerModal
          id={BOARD_ACCESS_MODAL_IDS.peoplePicker}
          title={pickerTitle}
          people={filtered}
          loading={loadingCandidates}
          error={candidatesError}
          search={search}
          selectedIds={selectedIds}
          inviting={inviting}
          onClose={closeModal}
          onSearchChange={setSearch}
          onToggleSelect={toggleSelect}
          onInvite={handleInviteSelected}
          onRetry={loadCandidates}
        />
      </ModalRoot>

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
