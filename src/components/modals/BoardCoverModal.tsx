import { useEffect, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import {
  Box,
  Button,
  FormItem,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  PanelHeaderClose,
} from '@vkontakte/vkui';
import { uploadImage } from '../../api/uploads';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID ?? 0);

interface BoardCoverModalProps {
  id: string;
  open: boolean;
  initialCoverImage?: string;
  onClose: () => void;
  onSave: (coverImage?: string) => Promise<void>;
  onError: (message: string) => void;
}

export function BoardCoverModal({
  id,
  open,
  initialCoverImage,
  onClose,
  onSave,
  onError,
}: BoardCoverModalProps) {
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCoverPreview(initialCoverImage ?? '');
    setCoverUrl(initialCoverImage ?? '');
    setUploadingCover(false);
    setSaving(false);
  }, [initialCoverImage, open]);

  const handleCoverFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingCover(true);

    try {
      const { url } = await uploadImage(file);
      setCoverUrl(url);
      setCoverPreview(url);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setUploadingCover(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const handleVKGallery = async () => {
    try {
      const auth = await bridge.send('VKWebAppGetAuthToken', {
        app_id: VK_APP_ID,
        scope: 'photos',
      });
      const response = await bridge.send('VKWebAppCallAPIMethod', {
        method: 'photos.getAll',
        params: {
          count: 1,
          access_token: auth.access_token,
          v: '5.131',
        },
      });
      const items = (
        response.response as {
          items?: Array<{ sizes?: Array<{ url: string; width: number }> }>;
        }
      )?.items ?? [];

      if (!items.length) {
        onError('Нет фото в галерее');
        return;
      }

      const sizes = items[0].sizes ?? [];
      const largest = [...sizes].sort((left, right) => right.width - left.width)[0];

      if (largest?.url) {
        setCoverUrl(largest.url);
        setCoverPreview(largest.url);
      }
    } catch {
      onError('Не удалось открыть галерею VK');
    }
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      await onSave(coverUrl || undefined);
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
          Обложка доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverFile}
            />
            {coverPreview && (
              <img
                src={coverPreview}
                alt="preview"
                style={{
                  width: '100%',
                  maxHeight: 160,
                  objectFit: 'cover',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Button
                size="m"
                mode="secondary"
                stretched
                loading={uploadingCover}
                disabled={uploadingCover}
                onClick={() => fileRef.current?.click()}
              >
                С устройства
              </Button>
              <Button
                size="m"
                mode="secondary"
                stretched
                onClick={handleVKGallery}
              >
                Из VK Фото
              </Button>
            </div>
            {coverPreview && (
              <Button
                size="m"
                appearance="negative"
                mode="outline"
                stretched
                style={{ marginBottom: 8 }}
                onClick={() => {
                  setCoverUrl('');
                  setCoverPreview('');
                }}
              >
                Убрать обложку
              </Button>
            )}
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
