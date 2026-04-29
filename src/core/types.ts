import type { DataConnection } from 'peerjs';

// ---- 消息协议 ----

export enum MessageType {
  PLAYER_JOIN = 'player:join',
  PLAYER_LEAVE = 'player:leave',
  ROOM_STATE = 'room:state',
  GAME_ACTION = 'game:action',
  GAME_STATE = 'game:state',
}

export interface GameMessage<T = unknown> {
  type: MessageType | string;
  payload: T;
  senderId: string;
  timestamp: number;
}

// ---- 玩家与房间 ----

export interface Player {
  id: string;
  name: string;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  players: Player[];
}

// ---- 连接状态 ----

export enum PeerStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export enum RoomRole {
  None = 'none',
  Host = 'host',
  Client = 'client',
}

// ---- 内部类型 ----

export interface PeerConnection {
  peerId: string;
  connection: DataConnection;
}

export type MessageHandler<T = unknown> = (message: GameMessage<T>) => void;
