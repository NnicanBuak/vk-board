import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormItem,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
  Textarea,
} from '@vkontakte/vkui';

interface BoardDescriptionModalProps {
  id: string;
  open: boolean;
  initialDescription: string;
  onClose: () => void;
  onSave: (description?: string) => Promise<void>;
  onError: (message: string) => void;
}

export function BoardDescriptionModal({
  id,
  open,
  initialDescription,
  onClose,
  onSave,
  onError,
}: BoardDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription(initialDescription);
    setSaving(false);

    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialDescription, open]);

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      await onSave(description.trim() || undefined);
      onClose();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPage
      id={id}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={onClose} />}>
          Описание доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem top="Описание">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Необязательно"
              maxLength={300}
              rows={4}
              getRef={textareaRef}
            />
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              Сохранить
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>
  );
}
