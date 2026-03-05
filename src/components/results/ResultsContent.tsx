import { Group, Header, SimpleCell, Caption, Button, Div } from '@vkontakte/vkui';
import { Icon28LikeFillRed } from '@vkontakte/icons';
import type { Card } from '../../types/card';

interface Props {
  cards: Card[];
  onClose: () => void;
}

export function ResultsContent({ cards, onClose }: Props) {
  const top3 = [...cards]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 3);

  const selected = cards.filter((c) => c.status === 'selected');

  const buildSummaryText = () => {
    const lines: string[] = ['📋 Итоги голосования\n'];
    if (top3.length) {
      lines.push('🏆 Топ по лайкам:');
      top3.forEach((c, i) => lines.push(`${i + 1}. ${c.title} (${c.likeCount} ❤️)`));
    }
    if (selected.length) {
      lines.push('\n✅ Выбранные:');
      selected.forEach((c) => lines.push(`• ${c.title}`));
    }
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSummaryText()).catch(() => {});
    onClose();
  };

  return (
    <>
      {top3.length > 0 && (
        <Group header={<Header>Топ по лайкам</Header>}>
          {top3.map((card, index) => (
            <SimpleCell
              key={card.id}
              before={<Caption style={{ width: 20, textAlign: 'center' }}>{index + 1}</Caption>}
              after={
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon28LikeFillRed />
                  <Caption>{card.likeCount}</Caption>
                </div>
              }
              subtitle={card.description ?? undefined}
              multiline
            >
              {card.title}
            </SimpleCell>
          ))}
        </Group>
      )}

      {selected.length > 0 && (
        <Group header={<Header>Выбранные</Header>}>
          {selected.map((card) => (
            <SimpleCell key={card.id} subtitle={card.description ?? undefined} multiline>
              {card.title}
            </SimpleCell>
          ))}
        </Group>
      )}

      {top3.length === 0 && selected.length === 0 && (
        <Div>
          <Caption style={{ color: 'var(--vkui--color_text_secondary)', textAlign: 'center' }}>
            Пока нет данных для отображения
          </Caption>
        </Div>
      )}

      <Div>
        <Button size="l" stretched onClick={handleCopy}>
          Скопировать итог
        </Button>
      </Div>
    </>
  );
}
