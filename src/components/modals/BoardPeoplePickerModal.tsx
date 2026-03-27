import {
  Avatar,
  Button,
  Cell,
  Checkbox,
  Div,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
  Placeholder,
  Search,
  Spinner,
} from '@vkontakte/vkui';

export interface VKPerson {
  id: number;
  firstName: string;
  lastName: string;
  photo: string;
}

interface BoardPeoplePickerModalProps {
  id: string;
  title: string;
  people: VKPerson[];
  loading: boolean;
  error: string | null;
  search: string;
  selectedIds: number[];
  inviting: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onToggleSelect: (userId: number) => void;
  onInvite: () => void;
  onRetry: () => void;
}

export function BoardPeoplePickerModal({
  id,
  title,
  people,
  loading,
  error,
  search,
  selectedIds,
  inviting,
  onClose,
  onSearchChange,
  onToggleSelect,
  onInvite,
  onRetry,
}: BoardPeoplePickerModalProps) {
  return (
    <ModalPage
      id={id}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={onClose} />}>
          {title}
        </ModalPageHeader>
      }
      footer={
        selectedIds.length > 0 ? (
          <Div>
            <Button
              size="l"
              stretched
              onClick={onInvite}
              loading={inviting}
              disabled={inviting}
            >
              Добавить {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
            </Button>
          </Div>
        ) : null
      }
    >
      <ModalPageContent>
        {loading ? (
          <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner size="l" />
          </Div>
        ) : error ? (
          <Placeholder action={<Button onClick={onRetry}>Повторить</Button>}>
            {error}
          </Placeholder>
        ) : (
          <>
            <Search
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {people.length === 0 ? (
              <Placeholder>Никого нет</Placeholder>
            ) : (
              people.map((person) => {
                const checked = selectedIds.includes(person.id);

                return (
                  <Cell
                    key={person.id}
                    before={(
                      <Avatar size={40} src={person.photo || undefined}>
                        {!person.photo
                          ? `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
                          : ''}
                      </Avatar>
                    )}
                    after={(
                      <Checkbox
                        checked={checked}
                        onChange={() => onToggleSelect(person.id)}
                      />
                    )}
                    onClick={() => onToggleSelect(person.id)}
                  >
                    {person.firstName} {person.lastName}
                  </Cell>
                );
              })
            )}
          </>
        )}
      </ModalPageContent>
    </ModalPage>
  );
}
