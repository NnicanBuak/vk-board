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
  Select,
  Button,
  Div,
  Search,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  Checkbox,
  Placeholder,
  SegmentedControl,
} from '@vkontakte/vkui';
import { Icon28UserAddOutline } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { boardsApi } from '../api/boards';
import { useBoardDetail } from '../hooks/useBoardDetail';
import { useUser } from '../store/UserContext';
import type { BoardVisibility } from '../types/board';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID ?? 0);

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  editor: 'Редактор',
  viewer: 'Читатель',
  member: 'Участник',
};

// Admin role is never assigned manually — it comes from VK chat/community admin status.
const ASSIGNABLE_ROLES = [
  { value: 'editor', label: 'Редактор' },
  { value: 'viewer', label: 'Читатель' },
];

interface VKPerson {
  id: number;
  firstName: string;
  lastName: string;
  photo: string;
}

const MODAL_PICKER = 'people_picker';

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

  const [members, setMembers] = useState<{ userId: number; role: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);

  // People picker state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<VKPerson[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const isAdmin = board?.myRole === 'admin' || board?.myRole === 'owner';

  // Board context: chat / community / personal
  const boardContext = board
    ? board.chatId ? 'chat'
    : board.groupId ? 'community'
    : 'personal'
    : null;

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
      } else if (boardContext === 'community' && board?.groupId) {
        // Community members — needs groups scope
        const auth = await bridge.send('VKWebAppGetAuthToken', {
          app_id: VK_APP_ID,
          scope: 'groups',
        });
        const res = await bridge.send('VKWebAppCallAPIMethod', {
          method: 'groups.getMembers',
          params: {
            group_id: board.groupId,
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
    } catch (e) {
      setCandidatesError('Не удалось загрузить список. Проверьте разрешения или попробуйте снова.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openPicker = async () => {
    setActiveModal(MODAL_PICKER);
    await loadCandidates();
  };

  const existingIds = new Set(members.map((m) => m.userId));

  const filtered = useMemo(() =>
    candidates
      .filter((c) => !existingIds.has(c.id))
      .filter((c) => {
        const q = search.toLowerCase();
        return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
      }),
  [candidates, search, existingIds, members]);

  const toggleSelect = (uid: number) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleInviteSelected = async () => {
    if (!selectedIds.length) return;
    setInviting(true);
    try {
      const added: { userId: number; role: string }[] = [];
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

  const handleRoleChange = async (userId: number, role: string) => {
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

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => navigator.back()} />}>
        Доступ
      </PanelHeader>

      {/* Visibility */}
      <Group header={<Header size="s">Видимость доски</Header>}>
        <Div>
          <SegmentedControl
            size="m"
            value={visibility}
            onChange={(v) => isAdmin && handleVisibilityToggle(v as BoardVisibility)}
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
          const isProtected = m.role === 'owner' || m.role === 'admin' || isMe;
          // Can change role only if: I'm admin/owner, the member isn't protected, and board isn't personal (admins come from VK context on chat/community boards)
          const canChangeRole = isAdmin && !isProtected && boardContext !== 'personal';
          return (
            <Cell
              key={m.userId}
              before={<Avatar size={40}>{String(m.userId).slice(-2)}</Avatar>}
              subtitle={
                canChangeRole ? (
                  <Select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    options={ASSIGNABLE_ROLES}
                    style={{ marginTop: 4, minWidth: 150 }}
                  />
                ) : (
                  ROLE_LABELS[m.role] ?? m.role
                )
              }
              after={
                isAdmin && !isProtected ? (
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
      {isAdmin && (
        <Group header={<Header size="s">Пригласить</Header>}>
          <Div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
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
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id={MODAL_PICKER}
          hideCloseButton
          header={
            <ModalPageHeader
              after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}
            >
              {boardContext === 'chat' ? 'Участники чата'
                : boardContext === 'community' ? 'Участники сообщества'
                : 'Друзья'}
            </ModalPageHeader>
          }
          footer={
            selectedIds.length > 0 ? (
              <Div>
                <Button
                  size="l"
                  stretched
                  onClick={handleInviteSelected}
                  loading={inviting}
                  disabled={inviting}
                >
                  Добавить {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                </Button>
              </Div>
            ) : null
          }
        >
          {loadingCandidates ? (
            <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spinner size="l" />
            </Div>
          ) : candidatesError ? (
            <Placeholder
              action={
                <Button onClick={loadCandidates}>Повторить</Button>
              }
            >
              {candidatesError}
            </Placeholder>
          ) : (
            <>
              <Search value={search} onChange={(e) => setSearch(e.target.value)} />
              {filtered.length === 0 ? (
                <Placeholder>Никого нет</Placeholder>
              ) : (
                filtered.map((person) => {
                  const checked = selectedIds.includes(person.id);
                  return (
                    <Cell
                      key={person.id}
                      before={
                        <Avatar size={40} src={person.photo || undefined}>
                          {!person.photo ? `${person.firstName.charAt(0)}${person.lastName.charAt(0)}` : ''}
                        </Avatar>
                      }
                      after={
                        <Checkbox
                          checked={checked}
                          onChange={() => toggleSelect(person.id)}
                        />
                      }
                      onClick={() => toggleSelect(person.id)}
                    >
                      {person.firstName} {person.lastName}
                    </Cell>
                  );
                })
              )}
            </>
          )}
        </ModalPage>
      </ModalRoot>

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
