import {
  CellButton,
  List,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
} from '@vkontakte/vkui';
import {
  Icon16ClockOutline,
  Icon16Done,
  Icon16Like,
} from '@vkontakte/icons';

interface BrainstormSortModalProps {
  id: string;
  sortMode: 'likes' | 'date';
  onClose: () => void;
  onSelect: (mode: 'likes' | 'date') => void;
}

export function BrainstormSortModal({
  id,
  sortMode,
  onClose,
  onSelect,
}: BrainstormSortModalProps) {
  return (
    <ModalPage
      id={id}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={onClose} />}>
          Сортировка
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <List>
          <CellButton
            before={<Icon16Like />}
            after={sortMode === 'likes' ? <Icon16Done /> : undefined}
            onClick={() => onSelect('likes')}
          >
            По лайкам
          </CellButton>
          <CellButton
            before={<Icon16ClockOutline />}
            after={sortMode === 'date' ? <Icon16Done /> : undefined}
            onClick={() => onSelect('date')}
          >
            По дате
          </CellButton>
        </List>
      </ModalPageContent>
    </ModalPage>
  );
}
