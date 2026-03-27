import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  FormItem,
  Input,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
} from "@vkontakte/vkui";

interface CreateColumnModalProps {
  id: string;
  open: boolean;
  title: string;
  fieldLabel: string;
  placeholder: string;
  submitLabel: string;
  onClose: () => void;
  onCreate: (value: string) => Promise<void>;
  onError: (message: string) => void;
}

export function CreateColumnModal({
  id,
  open,
  title,
  fieldLabel,
  placeholder,
  submitLabel,
  onClose,
  onCreate,
  onError,
}: CreateColumnModalProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue("");
    setSaving(false);

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleCreate = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || saving) {
      return;
    }

    setSaving(true);

    try {
      await onCreate(trimmedValue);
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
          {title}
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem top={fieldLabel}>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCreate();
                }
              }}
              getRef={inputRef}
            />
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={handleCreate}
              disabled={!value.trim() || saving}
              loading={saving}
            >
              {submitLabel}
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>
  );
}
