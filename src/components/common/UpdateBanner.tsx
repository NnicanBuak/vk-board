interface Props {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--vkui--color_background_modal)',
        borderTop: '1px solid var(--vkui--color_separator_primary)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--vkui--color_text_primary)' }}>
        Доступна новая версия
      </span>
      <button
        onClick={onUpdate}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--vkui--color_accent)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Обновить
      </button>
    </div>
  );
}
