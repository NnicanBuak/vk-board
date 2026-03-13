import { useState, useEffect, useRef } from 'react';
import { presenceApi, type PresenceUser } from '../api/presence';

const HEARTBEAT_MS = 30_000; // send heartbeat every 30 s
const POLL_MS = 15_000;      // refresh viewer list every 15 s

interface SelfInfo {
  firstName: string;
  lastName: string;
  photo100: string;
}

export function usePresence(boardId: string, self: SelfInfo | null) {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const selfRef = useRef(self);
  selfRef.current = self;

  useEffect(() => {
    if (!boardId || !self) return;

    let alive = true;

    const join = () => {
      if (selfRef.current) {
        presenceApi.join(boardId, selfRef.current).catch(() => {});
      }
    };

    const refresh = () => {
      presenceApi.list(boardId).then((list) => { if (alive) setViewers(list); }).catch(() => {});
    };

    join();
    refresh();

    const heartbeat = setInterval(join, HEARTBEAT_MS);
    const poll = setInterval(refresh, POLL_MS);

    return () => {
      alive = false;
      clearInterval(heartbeat);
      clearInterval(poll);
      presenceApi.leave(boardId).catch(() => {});
    };
  }, [boardId, !!self]);

  return viewers;
}
