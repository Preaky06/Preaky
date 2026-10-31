import type { Server, Socket } from 'socket.io';
import { CODE_LENGTH } from '../shared/constants.ts';
import type { ClientToServer, ServerToClient } from '../shared/types.ts';
import { Room, type Player } from './game.ts';
import { makeCode } from './util.ts';

type IO = Server<ClientToServer, ServerToClient>;
type Sock = Socket<ClientToServer, ServerToClient>;

interface Binding {
  code: string;
  playerId: string | null;
}

const MAX_ROOMS = 1000;
const ROOM_IDLE_MS = 20 * 60_000;

export class RoomManager {
  rooms = new Map<string, Room>();
  private bindings = new Map<string, Binding>();
  private sweep: NodeJS.Timeout;

  constructor(
    private io: IO,
    private timeScale = 1,
  ) {
    this.sweep = setInterval(() => this.maintenance(), 5000);
    this.sweep.unref();
  }

  close() {
    clearInterval(this.sweep);
    for (const r of this.rooms.values()) r.dispose();
  }

  private createRoom(): Room | null {
    if (this.rooms.size >= MAX_ROOMS) return null;
    let code = makeCode(CODE_LENGTH);
    while (this.rooms.has(code)) code = makeCode(CODE_LENGTH);
    const room = new Room(
      code,
      {
        onChange: (r) => this.broadcast(r),
        onReaction: (r, playerId, emoji) => this.io.to(`room:${r.code}`).emit('reaction', { playerId, emoji }),
        onKick: (r, p) => this.kick(r, p),
      },
      this.timeScale,
    );
    this.rooms.set(code, room);
    return room;
  }

  private broadcast(room: Room) {
    for (const p of room.players.values()) {
      if (!p.sockets.size) continue;
      const view = room.viewFor(p.id);
      for (const sid of p.sockets) this.io.to(sid).emit('state', view);
    }
    if (room.spectators.size) {
      const view = room.viewFor(null);
      for (const sid of room.spectators) this.io.to(sid).emit('state', view);
    }
  }

  private kick(room: Room, p: Player) {
    for (const sid of p.sockets) {
      const s = this.io.sockets.sockets.get(sid);
      if (!s) continue;
      s.emit('kicked');
      s.leave(`room:${room.code}`);
      this.bindings.delete(sid);
    }
    p.sockets.clear();
  }

  private maintenance() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      room.tick(now);
      const anyone = room.connectedPlayers().length > 0 || room.spectators.size > 0;
      if (!anyone && now - room.lastActivity > ROOM_IDLE_MS) {
        room.dispose();
        this.rooms.delete(code);
      }
    }
  }

  private unbind(socket: Sock) {
    const b = this.bindings.get(socket.id);
    if (!b) return;
    this.bindings.delete(socket.id);
    socket.leave(`room:${b.code}`);
    const room = this.rooms.get(b.code);
    room?.detach(socket.id);
  }

  private bindPlayer(socket: Sock, room: Room, player: Player) {
    this.unbind(socket);
    this.bindings.set(socket.id, { code: room.code, playerId: player.id });
    socket.join(`room:${room.code}`);
    room.attach(player, socket.id);
  }

  private ctx(socket: Sock): { room: Room; playerId: string } | null {
    const b = this.bindings.get(socket.id);
    if (!b || !b.playerId) return null;
    const room = this.rooms.get(b.code);
    if (!room || !room.players.has(b.playerId)) return null;
    return { room, playerId: b.playerId };
  }

  private host(socket: Sock): Room | null {
    const c = this.ctx(socket);
    if (!c || c.room.hostId !== c.playerId) return null;
    return c.room;
  }

  handle(socket: Sock) {
    const safe =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        try {
          fn(...args);
        } catch (err) {
          console.error('[socket] erreur', err);
        }
      };
    const ackOf = (v: unknown) => (typeof v === 'function' ? (v as (r: unknown) => void) : () => {});

    socket.on(
      'room:create',
      safe((p, ack) => {
        const reply = ackOf(ack);
        const room = this.createRoom();
        if (!room) return reply({ ok: false, error: 'Trop de salons ouverts, réessaie dans un instant.' });
        const player = room.addPlayer(p?.name, p?.avatar);
        if (typeof player === 'string') return reply({ ok: false, error: player });
        this.bindPlayer(socket, room, player);
        reply({ ok: true, code: room.code, playerId: player.id, token: player.token });
      }),
    );

    socket.on(
      'room:join',
      safe((p, ack) => {
        const reply = ackOf(ack);
        const code = String(p?.code ?? '').toUpperCase().trim();
        const room = this.rooms.get(code);
        if (!room) return reply({ ok: false, error: 'Aucune opération avec ce code. Vérifie les 4 lettres.' });
        const player = room.addPlayer(p?.name, p?.avatar);
        if (typeof player === 'string') return reply({ ok: false, error: player });
        this.bindPlayer(socket, room, player);
        reply({ ok: true, code: room.code, playerId: player.id, token: player.token });
      }),
    );

    socket.on(
      'room:resume',
      safe((p, ack) => {
        const reply = ackOf(ack);
        const room = this.rooms.get(String(p?.code ?? '').toUpperCase());
        const player = room?.players.get(String(p?.playerId ?? ''));
        if (!room || !player || player.token !== p?.token) return reply({ ok: false, error: 'Session expirée.' });
        this.bindPlayer(socket, room, player);
        reply({ ok: true, code: room.code, playerId: player.id, token: player.token });
      }),
    );

    socket.on(
      'room:spectate',
      safe((p, ack) => {
        const reply = ackOf(ack);
        const room = this.rooms.get(String(p?.code ?? '').toUpperCase().trim());
        if (!room) return reply({ ok: false, error: 'Aucune opération avec ce code.' });
        this.unbind(socket);
        this.bindings.set(socket.id, { code: room.code, playerId: null });
        socket.join(`room:${room.code}`);
        room.spectators.add(socket.id);
        reply({ ok: true });
        socket.emit('state', room.viewFor(null));
      }),
    );

    socket.on(
      'room:leave',
      safe(() => {
        const c = this.ctx(socket);
        if (c) {
          const player = c.room.players.get(c.playerId);
          this.unbind(socket);
          if (player) {
            for (const sid of player.sockets) this.bindings.delete(sid);
            c.room.removePlayer(c.playerId, 'left');
          }
        } else {
          this.unbind(socket);
        }
      }),
    );

    socket.on('player:profile', safe((p) => this.ctx(socket)?.room.updateProfile(this.ctx(socket)!.playerId, p?.name, p?.avatar)));

    socket.on('host:settings', safe((p) => this.host(socket)?.updateSettings(p ?? {})));
    socket.on(
      'host:custom',
      safe((list, ack) => {
        const reply = ackOf(ack);
        const room = this.host(socket);
        if (!room) return reply({ ok: false, error: 'Réservé au chef d’opération.' });
        const res = room.setCustom(list);
        if (typeof res === 'string') return reply({ ok: false, error: res });
        reply({ ok: true, count: res });
      }),
    );
    socket.on(
      'host:kick',
      safe((p) => {
        const room = this.host(socket);
        if (room && p?.playerId && p.playerId !== room.hostId) room.removePlayer(p.playerId, 'kicked');
      }),
    );
    socket.on('host:transfer', safe((p) => this.host(socket)?.transferHost(p?.playerId)));
    socket.on(
      'host:start',
      safe((ack) => {
        const reply = ackOf(ack);
        const room = this.host(socket);
        if (!room) return reply({ ok: false, error: 'Seul le chef d’opération peut lancer la partie.' });
        const err = room.start();
        reply(err ? { ok: false, error: err } : { ok: true });
      }),
    );
    socket.on('host:next', safe(() => this.host(socket)?.hostNext()));
    socket.on('host:pause', safe(() => this.host(socket)?.togglePause()));
    socket.on('host:lobby', safe(() => this.host(socket)?.backToLobby()));

    const withPlayer = (fn: (room: Room, playerId: string) => void) =>
      safe(() => {
        const c = this.ctx(socket);
        if (c) fn(c.room, c.playerId);
      });

    socket.on('role:ready', withPlayer((room, id) => room.setReady(id)));
    socket.on('answer:select', (p) => withPlayer((room, id) => room.select(id, p?.index, p?.option))());
    socket.on('answer:lock', (p) => withPlayer((room, id) => room.lock(id, p?.index))());
    socket.on(
      'mole:sabotage',
      safe((p, ack) => {
        const reply = ackOf(ack);
        const c = this.ctx(socket);
        if (!c) return reply({ ok: false, error: 'Hors opération.' });
        const err = c.room.sabotage(c.playerId, p?.kind);
        reply(err ? { ok: false, error: err } : { ok: true });
      }),
    );
    socket.on(
      'meeting:emergency',
      safe((ack) => {
        const reply = ackOf(ack);
        const c = this.ctx(socket);
        if (!c) return reply({ ok: false, error: 'Hors opération.' });
        const err = c.room.emergency(c.playerId);
        reply(err ? { ok: false, error: err } : { ok: true });
      }),
    );
    socket.on('meeting:accuse', (p) => withPlayer((room, id) => room.accuse(id, p?.targetId))());
    socket.on('meeting:defend', (p) => withPlayer((room, id) => room.defend(id, p?.targetId))());
    socket.on('meeting:react', (p) => withPlayer((room, id) => room.react(id, p?.emoji))());
    socket.on('meeting:skip', withPlayer((room, id) => room.skipMeeting(id)));
    socket.on('meeting:pass', withPlayer((room, id) => room.passTurn(id)));
    socket.on('vote:cast', (p) => withPlayer((room, id) => room.castVote(id, p?.targetId))());

    socket.on('disconnect', () => this.unbind(socket));
  }
}
