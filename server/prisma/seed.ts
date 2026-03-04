import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const board = await prisma.board.create({
    data: {
      title: 'Подарок Пете',
      description: 'Собираем идеи для подарка на день рождения',
      creatorId: 1,
      roles: {
        create: { userId: 1, role: 'admin' },
      },
    },
  });

  await prisma.card.createMany({
    data: [
      { boardId: board.id, authorId: 1, title: 'Книга по программированию', url: 'https://example.com/book' },
      { boardId: board.id, authorId: 2, title: 'Настольная игра Catan', description: 'Классика жанра' },
      { boardId: board.id, authorId: 2, title: 'Подписка на Spotify', status: 'selected' },
    ],
  });

  console.log('Seed completed. Board id:', board.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
