import type { DataConnection } from 'peerjs';

// ---- 消息协议 ----

export enum MessageType {
  PLAYER_JOIN = 'player:join',
  PLAYER_LEAVE = 'player:leave',
  ROOM_STATE = 'room:state',
  CHAT_HISTORY = 'chat:history',
  GAME_ACTION = 'game:action',
  GAME_STATE = 'game:state',
}

export interface GameMessage<T = unknown> {
  type: MessageType | string;
  payload: T;
  senderId: string;
  senderName?: string;
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

// ---- 服务器配置 ----

export interface PeerServerConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

export const ROOM_ID_PREFIX = 'cg-room-';

declare const __DEV_SERVER__: boolean;
declare const __PEER_SERVER_HOST__: string;

/**
 * 生产环境 → 连接 Render 上的 PeerJS 服务器
 * 开发环境 → 连接与页面同主机的本地 PeerJS 服务器（:9000）
 */
export const DEFAULT_SERVER_CONFIG: PeerServerConfig = __DEV_SERVER__
  ? { host: location.hostname, port: 9000, path: '/cardgame', secure: false }
  : { host: __PEER_SERVER_HOST__, port: 443, path: '/cardgame', secure: true };

// ---- 房间发现 ----

export interface RoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
}
