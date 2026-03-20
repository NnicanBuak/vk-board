import { useState } from 'react';
import { FormItem, Input, Textarea, Button, Box } from '@vkontakte/vkui';
import type { Card } from '../../types/card';

interface FormData {
  title: string;
  description?: string;
  url?: string;
}

interface Props {
  initial?: Pick<Card, 'title' | 'description' | 'url'>;
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function CardForm({ initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value: string) => {
    if (!value) return '';
    try {
      new URL(value);
      return '';
    } catch {
      return 'Некорректный URL';
    }
  };

  const handleSave = async () => {
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim() || undefined,
    });
    setSaving(false);
  };

  return (
    <Box>
      <FormItem top="Название *">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Краткое название идеи"
          maxLength={100}
        />
      </FormItem>
      <FormItem top="Описание">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробности (опционально)"
          maxLength={500}
          rows={3}
        />
      </FormItem>
      <FormItem top="Ссылка" status={urlError ? 'error' : 'default'} bottom={urlError}>
        <Input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
          placeholder="https://..."
          type="url"
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
      <FormItem>
        <Button
          size="l"
          mode="secondary"
          stretched
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </Button>
      </FormItem>
    </Box>
  );
}
