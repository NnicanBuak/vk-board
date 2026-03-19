import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Spinner } from '@vkontakte/vkui';
import {
  Icon24Dismiss,
  Icon16Like,
  Icon16LikeOutline,
  Icon24ExternalLinkOutline,
  Icon16Delete,
  Icon16Pen,
  Icon16Done,
  Icon16Cancel,
} from '@vkontakte/icons';
import { useComments } from '../../hooks/useComments';
import type { Card, Column, Tag } from '../../types/card';

interface Props {
  card: Card;
  columns: Column[];
  boardTags: Tag[];
  boardMembers: { userId: number; role: string }[];
  currentUserId: number;
  isAdmin: boolean;
  canEdit: boolean;
  onClose: () => void;
  onLike: () => void;
  onMoveColumn: (columnId: string | null) => void;
  onDelete: () => void;
  onUpdate: (data: { title?: string; description?: string; url?: string; assignees?: number[]; dueDate?: string | null }) => Promise<void>;
  onTagAssign: (tagId: string) => Promise<void>;
  onTagUnassign: (tagId: string) => Promise<void>;
  onTagCreate: (name: string) => Promise<void>;
}

export function CardDetailModal({
  card,
  columns,
  boardTags,
  boardMembers,
  currentUserId,
  isAdmin,
  canEdit,
  onClose,
  onLike,
  onMoveColumn,
  onDelete,
  onUpdate,
  onTagAssign,
  onTagUnassign,
  onTagCreate,
}: Props) {
  const { comments, loading: commentsLoading, addComment, removeComment } = useComments(card.id);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'description' | 'url' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [tagEditing, setTagEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagWrapRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const liked = card.likedBy.includes(currentUserId);
  const canEditTags = canEdit || card.authorId === currentUserId;

  const tagSuggestions = boardTags.filter(
    (t) => !card.tags.some((ct) => ct.id === t.id) &&
      t.name.toLowerCase().includes(tagInput.toLowerCase()),
  );

  const handleTagInputKey = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      await onTagCreate(tagInput.trim());
      setTagInput('');
    }
    if (e.key === 'Escape') { setTagEditing(false); setTagInput(''); }
  }, [tagInput, onTagCreate]);

  // Close tag editor on outside click
  useEffect(() => {
    if (!tagEditing) return;
    const handler = (e: MouseEvent) => {
      if (tagWrapRef.current && !tagWrapRef.current.contains(e.target as Node)) {
        setTagEditing(false);
        setTagInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tagEditing]);

  // Trap focus inside modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const startEdit = (field: 'title' | 'description' | 'url') => {
    setEditingField(field);
    setEditValue(
      field === 'title' ? card.title :
      field === 'description' ? (card.description ?? '') :
      (card.url ?? '')
    );
  };

  const commitEdit = async () => {
    if (!editingField) return;
    await onUpdate({ [editingField]: editValue });
    setEditingField(null);
  };

  const handleCommentSubmit = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await addComment(text);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cdm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cdm">
        {/* Header */}
        <div className="cdm__header">
          <button className="cdm__close" onClick={onClose} aria-label="Закрыть">
            <Icon24Dismiss />
          </button>

          <div className="cdm__actions">
            <button
              className={`cdm__action-btn${liked ? ' cdm__action-btn--active' : ''}`}
              onClick={onLike}
              aria-label={liked ? 'Убрать лайк' : 'Лайк'}
            >
              {liked ? <Icon16Like /> : <Icon16LikeOutline />}
              {card.likeCount > 0 && <span>{card.likeCount}</span>}
            </button>

            {isAdmin && (
              <button
                className="cdm__action-btn cdm__action-btn--danger"
                onClick={onDelete}
                aria-label="Удалить карточку"
              >
                <Icon16Delete />
              </button>
            )}
          </div>
        </div>

        <div className="cdm__body">
          {/* Image */}
          {card.imageUrl && (
            <div className="cdm__image-wrap">
              <img
                src={`/api/images?url=${encodeURIComponent(card.imageUrl)}`}
                alt=""
                className="cdm__image"
              />
            </div>
          )}

          {/* Title */}
          <div className="cdm__field">
            {editingField === 'title' ? (
              <div className="cdm__edit-row">
                <input
                  className="cdm__edit-input cdm__edit-input--title"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') setEditingField(null);
                  }}
                  autoFocus
                />
                <button className="cdm__edit-ok" onClick={commitEdit}><Icon16Done /></button>
                <button className="cdm__edit-cancel" onClick={() => setEditingField(null)}><Icon16Cancel /></button>
              </div>
            ) : (
              <div className="cdm__title-row">
                <h2 className="cdm__title">{card.title}</h2>
                {(isAdmin || card.authorId === currentUserId) && (
                  <button className="cdm__edit-btn" onClick={() => startEdit('title')} aria-label="Редактировать название">
                    <Icon16Pen />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="cdm__section">
            <div className="cdm__section-label">Теги</div>
            <div
              ref={tagWrapRef}
              className={`cdm__tag-editor${tagEditing ? ' cdm__tag-editor--editing' : ''}`}
              onClick={() => { if (!tagEditing && canEditTags) { setTagEditing(true); setTimeout(() => tagInputRef.current?.focus(), 0); } }}
            >
              {card.tags.map((tag) => (
                <span key={tag.id} className="cdm__tag-chip" style={{ background: tag.color + '33', color: tag.color }}>
                  {tag.name}
                  {tagEditing && (
                    <button
                      className="cdm__tag-chip-del"
                      onClick={(e) => { e.stopPropagation(); onTagUnassign(tag.id); }}
                      aria-label="Удалить тег"
                    >×</button>
                  )}
                </span>
              ))}

              {tagEditing ? (
                <div className="cdm__tag-input-wrap">
                  <input
                    ref={tagInputRef}
                    className="cdm__tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Тег…"
                    onKeyDown={handleTagInputKey}
                  />
                  {(tagSuggestions.length > 0 || (tagInput.trim() && !boardTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()))) && (
                    <div className="cdm__tag-dropdown">
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag.id}
                          className="cdm__tag-dropdown-item"
                          onMouseDown={(e) => { e.preventDefault(); onTagAssign(tag.id); setTagInput(''); }}
                        >
                          <span style={{ background: tag.color, borderRadius: '50%', width: 10, height: 10, display: 'inline-block', flexShrink: 0 }} />
                          {tag.name}
                        </button>
                      ))}
                      {tagInput.trim() && !boardTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                        <button
                          className="cdm__tag-dropdown-item cdm__tag-dropdown-item--create"
                          onMouseDown={async (e) => { e.preventDefault(); await onTagCreate(tagInput.trim()); setTagInput(''); }}
                        >
                          + Создать «{tagInput.trim()}»
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                canEditTags && (
                  <button className="cdm__tag-add-btn" onClick={(e) => { e.stopPropagation(); setTagEditing(true); setTimeout(() => tagInputRef.current?.focus(), 0); }}>
                    + тег
                  </button>
                )
              )}
            </div>
          </div>

          {/* Assignees */}
          {boardMembers.length > 0 && (
            <div className="cdm__section">
              <div className="cdm__section-label">Исполнители</div>
              <div className="cdm__assignees">
                {boardMembers.map((m) => {
                  const assigned = card.assignees.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      className={`cdm__assignee-btn${assigned ? ' cdm__assignee-btn--active' : ''}`}
                      onClick={() => {
                        if (!canEdit) return;
                        const next = assigned
                          ? card.assignees.filter((id) => id !== m.userId)
                          : [...card.assignees, m.userId];
                        onUpdate({ assignees: next });
                      }}
                      disabled={!canEdit}
                    >
                      <div className="cdm__assignee-avatar">
                        {String(m.userId).slice(-1)}
                      </div>
                      <span className="cdm__assignee-name">
                        {m.userId === currentUserId ? 'Вы' : `ID ${m.userId}`}
                      </span>
                      {assigned && <span className="cdm__assignee-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due date */}
          <div className="cdm__section">
            <div className="cdm__section-label">Дедлайн</div>
            <input
              type="date"
              className="cdm__date-input"
              value={card.dueDate ? card.dueDate.slice(0, 10) : ''}
              onChange={(e) => canEdit && onUpdate({ dueDate: e.target.value || null })}
              disabled={!canEdit}
            />
          </div>

          {/* Column (move) */}
          {columns.length > 0 && isAdmin && (
            <div className="cdm__section">
              <div className="cdm__section-label">Колонка</div>
              <div className="cdm__col-pills">
                <button
                  className={`cdm__col-pill${!card.columnId ? ' cdm__col-pill--active' : ''}`}
                  onClick={() => onMoveColumn(null)}
                >
                  Без колонки
                </button>
                {columns.map((col) => (
                  <button
                    key={col.id}
                    className={`cdm__col-pill${card.columnId === col.id ? ' cdm__col-pill--active' : ''}`}
                    onClick={() => onMoveColumn(col.id)}
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="cdm__section">
            <div className="cdm__section-label">Описание</div>
            {editingField === 'description' ? (
              <div className="cdm__edit-row cdm__edit-row--col">
                <textarea
                  className="cdm__edit-input cdm__edit-input--textarea"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingField(null);
                  }}
                  rows={4}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="cdm__edit-ok" onClick={commitEdit}><Icon16Done /> Сохранить</button>
                  <button className="cdm__edit-cancel" onClick={() => setEditingField(null)}><Icon16Cancel /></button>
                </div>
              </div>
            ) : (
              <div
                className="cdm__desc"
                onClick={() => (isAdmin || card.authorId === currentUserId) && startEdit('description')}
              >
                {card.description
                  ? <p>{card.description}</p>
                  : <span className="cdm__placeholder">Нажмите, чтобы добавить описание…</span>
                }
              </div>
            )}
          </div>

          {/* URL */}
          <div className="cdm__section">
            <div className="cdm__section-label">Ссылка</div>
            {editingField === 'url' ? (
              <div className="cdm__edit-row">
                <input
                  className="cdm__edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="https://…"
                  type="url"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') setEditingField(null);
                  }}
                  autoFocus
                />
                <button className="cdm__edit-ok" onClick={commitEdit}><Icon16Done /></button>
                <button className="cdm__edit-cancel" onClick={() => setEditingField(null)}><Icon16Cancel /></button>
              </div>
            ) : card.url ? (
              <div className="cdm__url-row">
                <a href={card.url} target="_blank" rel="noopener noreferrer" className="cdm__url">
                  <Icon24ExternalLinkOutline width={16} height={16} />
                  {card.url}
                </a>
                {(isAdmin || card.authorId === currentUserId) && (
                  <button className="cdm__edit-btn" onClick={() => startEdit('url')}><Icon16Pen /></button>
                )}
              </div>
            ) : (
              <span
                className="cdm__placeholder"
                onClick={() => (isAdmin || card.authorId === currentUserId) && startEdit('url')}
              >
                Нажмите, чтобы добавить ссылку…
              </span>
            )}
          </div>

          {/* Comments */}
          <div className="cdm__section">
            <div className="cdm__section-label">
              Комментарии {comments.length > 0 && `(${comments.length})`}
            </div>

            {commentsLoading ? (
              <Spinner size="s" />
            ) : (
              <div className="cdm__comments">
                {comments.map((comment) => (
                  <div key={comment.id} className="cdm__comment">
                    <div className="cdm__comment-header">
                      <span className="cdm__comment-author">
                        {comment.userId === currentUserId ? 'Вы' : `Пользователь ${comment.userId}`}
                      </span>
                      <span className="cdm__comment-date">
                        {new Date(comment.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {(comment.userId === currentUserId || isAdmin) && (
                        <button
                          className="cdm__comment-del"
                          onClick={() => removeComment(comment.id)}
                          aria-label="Удалить комментарий"
                        >
                          <Icon16Delete />
                        </button>
                      )}
                    </div>
                    <div className="cdm__comment-text">{comment.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="cdm__comment-form">
              <textarea
                ref={commentInputRef}
                className="cdm__comment-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий…"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommentSubmit();
                }}
              />
              <button
                className="cdm__comment-submit"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? <Spinner size="s" /> : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
