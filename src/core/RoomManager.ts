import { PeerService } from './PeerService';
import { MessageBus } from './MessageBus';
import {
  MessageType,
  RoomRole,
  type GameMessage,
  type Player,
  type RoomState,
} from './types';

type RoomStateChangeCallback = (state: RoomState) => void;

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
    const peerId = await this.peerService.init();

    this._role = RoomRole.Host;
    this._roomState = {
      roomId: peerId,
      hostId: peerId,
      players: [{ id: peerId, name: playerName }],
    };

    this.unsubConn = this.peerService.onConnection(({ peerId: remotePeerId }) => {
      // 新连接时还不知道玩家名，等待 PLAYER_JOIN 消息
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

    return new Promise((resolve) => {
      const handler = (msg: GameMessage<RoomState>) => {
        if (msg.type === MessageType.ROOM_STATE) {
          this.messageBus.off(MessageType.ROOM_STATE, handler);
          resolve(msg.payload);
        }
      };
      this.messageBus.on(MessageType.ROOM_STATE, handler);
    });
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

      default: {
        this.messageBus.emit(msg);
        // Host 转发非系统消息给所有其他客户端
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
