import { PeerService } from './PeerService';
import { MessageBus } from './MessageBus';
import {
  MessageType,
  RoomRole,
  ROOM_ID_PREFIX,
  type GameMessage,
  type Player,
  type RoomState,
  type RoomInfo,
} from './types';

type RoomStateChangeCallback = (state: RoomState) => void;

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return ROOM_ID_PREFIX + id;
}

export class RoomManager {
  private peerService: PeerService;
  private messageBus: MessageBus;
  private stateListeners = new Set<RoomStateChangeCallback>();

  private _role: RoomRole = RoomRole.None;
  private _roomState: RoomState | null = null;
  private _playerName = '';

  private unsubData: (() => void) | null = null;
  private unsubConn: (() => void) | null = null;

  constructor(peerService: PeerService, messageBus: MessageBus) {
    this.peerService = peerService;
    this.messageBus = messageBus;
  }

  get role(): RoomRole {
    return this._role;
  }

  get roomState(): RoomState | null {
    return this._roomState;
  }

  get playerName(): string {
    return this._playerName;
  }

  async createRoom(playerName: string): Promise<RoomState> {
    this._playerName = playerName;
    const roomId = generateRoomId();
    const peerId = await this.peerService.init(roomId);

    this._role = RoomRole.Host;
    this._roomState = {
      roomId: peerId,
      hostId: peerId,
      players: [{ id: peerId, name: playerName }],
    };

    this.unsubConn = this.peerService.onConnection(({ peerId: remotePeerId }) => {
      console.log(`[Host] New connection from: ${remotePeerId}`);
    });

    this.unsubData = this.peerService.onData((senderId, data) => {
      const msg = data as GameMessage;
      msg.senderId = senderId;
      this.handleHostMessage(msg);
    });

    this.notifyStateChange();
    return this._roomState;
  }

  async joinRoom(roomId: string, playerName: string): Promise<RoomState> {
    this._playerName = playerName;
    await this.peerService.init();

    this._role = RoomRole.Client;
    // 先设置临时 roomState 以便 sendToHost 能正常工作
    this._roomState = { roomId, hostId: roomId, players: [] };

    await this.peerService.connectTo(roomId);

    this.unsubData = this.peerService.onData((_senderId, data) => {
      const msg = data as GameMessage;
      this.handleClientMessage(msg);
    });

    this.sendToHost({
      type: MessageType.PLAYER_JOIN,
      payload: { name: playerName },
      senderId: this.peerService.peerId!,
      timestamp: Date.now(),
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageBus.off(MessageType.ROOM_STATE, handler);
        reject(new Error('加入房间超时，房间可能已关闭'));
      }, 10000);

      const handler = (msg: GameMessage<RoomState>) => {
        if (msg.type === MessageType.ROOM_STATE) {
          clearTimeout(timeout);
          this.messageBus.off(MessageType.ROOM_STATE, handler);
          resolve(msg.payload);
        }
      };
      this.messageBus.on(MessageType.ROOM_STATE, handler);
    });
  }

  /**
   * 查询指定房间的元数据。
   * 临时建立连接获取房间信息后立即断开。
   */
  async queryRoomInfo(roomId: string): Promise<RoomInfo | null> {
    const tmpPeer = new PeerService();
    try {
      await tmpPeer.init();
      const conn = await tmpPeer.connectTo(roomId);

      return new Promise<RoomInfo | null>((resolve) => {
        const timeout = setTimeout(() => {
          tmpPeer.destroy();
          resolve(null);
        }, 3000);

        conn.on('data', (data) => {
          const msg = data as GameMessage;
          if (msg.type === MessageType.ROOM_STATE) {
            clearTimeout(timeout);
            const state = msg.payload as RoomState;
            const hostPlayer = state.players.find((p) => p.id === state.hostId);
            tmpPeer.destroy();
            resolve({
              roomId: state.roomId,
              hostName: hostPlayer?.name ?? 'Unknown',
              playerCount: state.players.length,
            });
          }
        });

        // 发送一个探测消息请求房间状态
        conn.on('open', () => {
          conn.send({
            type: MessageType.ROOM_STATE,
            payload: { query: true },
            senderId: tmpPeer.peerId,
            timestamp: Date.now(),
          } as GameMessage);
        });
      });
    } catch {
      tmpPeer.destroy();
      return null;
    }
  }

  leaveRoom(): void {
    if (this._role === RoomRole.Host && this._roomState) {
      this.broadcast({
        type: MessageType.PLAYER_LEAVE,
        payload: { id: this.peerService.peerId },
        senderId: this.peerService.peerId!,
        timestamp: Date.now(),
      });
    }

    this.unsubData?.();
    this.unsubConn?.();
    this.unsubData = null;
    this.unsubConn = null;

    this.peerService.destroy();
    this._role = RoomRole.None;
    this._roomState = null;
    this._playerName = '';
    this.notifyStateChange();
  }

  sendMessage(type: string, payload: unknown): void {
    const msg: GameMessage = {
      type,
      payload,
      senderId: this.peerService.peerId!,
      timestamp: Date.now(),
    };

    if (this._role === RoomRole.Host) {
      this.messageBus.emit(msg);
      this.broadcast(msg);
    } else if (this._role === RoomRole.Client) {
      this.sendToHost(msg);
    }
  }

  onRoomStateChange(callback: RoomStateChangeCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  private handleHostMessage(msg: GameMessage): void {
    if (!this._roomState) return;

    switch (msg.type) {
      case MessageType.PLAYER_JOIN: {
        const { name } = msg.payload as { name: string };
        const newPlayer: Player = { id: msg.senderId, name };

        if (!this._roomState.players.find((p) => p.id === newPlayer.id)) {
          this._roomState = {
            ...this._roomState,
            players: [...this._roomState.players, newPlayer],
          };
        }

        this.broadcast({
          type: MessageType.ROOM_STATE,
          payload: this._roomState,
          senderId: this.peerService.peerId!,
          timestamp: Date.now(),
        });
        this.notifyStateChange();
        break;
      }

      case MessageType.PLAYER_LEAVE: {
        const { id } = msg.payload as { id: string };
        this._roomState = {
          ...this._roomState,
          players: this._roomState.players.filter((p) => p.id !== id),
        };
        this.broadcast({
          type: MessageType.ROOM_STATE,
          payload: this._roomState,
          senderId: this.peerService.peerId!,
          timestamp: Date.now(),
        });
        this.peerService.disconnect(id);
        this.notifyStateChange();
        break;
      }

      case MessageType.ROOM_STATE: {
        const payload = msg.payload as { query?: boolean };
        if (payload.query) {
          // 有人在探测房间信息，回复当前状态
          this.peerService.send(msg.senderId, {
            type: MessageType.ROOM_STATE,
            payload: this._roomState,
            senderId: this.peerService.peerId!,
            timestamp: Date.now(),
          });
        }
        break;
      }

      default: {
        this.messageBus.emit(msg);
        this.peerService.activeConnections.forEach((conn, peerId) => {
          if (peerId !== msg.senderId && conn.open) {
            conn.send(msg);
          }
        });
        break;
      }
    }
  }

  private handleClientMessage(msg: GameMessage): void {
    if (msg.type === MessageType.ROOM_STATE) {
      this._roomState = msg.payload as RoomState;
      this.notifyStateChange();
    }
    this.messageBus.emit(msg);
  }

  private sendToHost(msg: GameMessage): void {
    if (this._roomState) {
      this.peerService.send(this._roomState.hostId, msg);
    }
  }

  private broadcast(msg: GameMessage): void {
    this.peerService.broadcast(msg);
  }

  private notifyStateChange(): void {
    if (this._roomState) {
      this.stateListeners.forEach((l) => l(this._roomState!));
    }
  }
}
