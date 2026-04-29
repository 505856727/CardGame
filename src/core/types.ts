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

// ---- 服务器配置 ----

export interface PeerServerConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

export const ROOM_ID_PREFIX = 'cg-room-';

const isLocalDev = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

/**
 * 本地开发 → 连接 localhost:9000 自建 PeerJS 服务器（支持房间发现）
 * 生产环境 → 连接 PeerJS 公共云服务器（不支持房间发现，但创建/加入房间正常）
 */
export const DEFAULT_SERVER_CONFIG: PeerServerConfig = isLocalDev
  ? { host: 'localhost', port: 9000, path: '/cardgame', secure: false }
  : { host: '0.peerjs.com', port: 443, path: '/', secure: true };

// ---- 房间发现 ----

export interface RoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
}
