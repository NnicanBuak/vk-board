import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormItem,
  Input,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
} from '@vkontakte/vkui';

interface BoardRenameModalProps {
  id: string;
  open: boolean;
  initialTitle: string;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
  onError: (message: string) => void;
}

export function BoardRenameModal({
  id,
  open,
  initialTitle,
  onClose,
  onSave,
  onError,
}: BoardRenameModalProps) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialTitle);
    setSaving(false);

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [initialTitle, open]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || saving) {
      return;
    }

    setSaving(true);

    try {
      await onSave(trimmedTitle);
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
          Название доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem top="Название *">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              getRef={inputRef}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={handleSave}
              disabled={!title.trim() || saving}
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
