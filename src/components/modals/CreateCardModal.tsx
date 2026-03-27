import {
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
} from "@vkontakte/vkui";
import { CardForm } from "../card/CardForm";

interface CreateCardData {
  title: string;
  description?: string;
  url?: string;
}

interface CreateCardModalProps {
  id: string;
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (data: CreateCardData) => Promise<void>;
  onError: (message: string) => void;
}

export function CreateCardModal({
  id,
  open,
  title,
  onClose,
  onSave,
  onError,
}: CreateCardModalProps) {
  const handleSave = async (data: CreateCardData) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      onError((error as Error).message);
    }
  };

  return (
    <ModalPage
      id={id}
      dynamicContentHeight
      hideCloseButton
      header={<ModalPageHeader>{title}</ModalPageHeader>}
    >
      <ModalPageContent>
        <CardForm
          key={`${id}-${open ? "open" : "closed"}`}
          onSave={handleSave}
          onCancel={onClose}
        />
      </ModalPageContent>
    </ModalPage>
  );
}
