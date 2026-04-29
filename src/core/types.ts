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

const isGitHubPages = typeof location !== 'undefined'
  && location.hostname.endsWith('.github.io');

/**
 * GitHub Pages → 连接 PeerJS 公共云服务器（不支持房间发现，但创建/加入房间正常）
 * 其他环境（本地/局域网） → 连接与页面同主机的 PeerJS 服务器（:9000）
 *   localhost 访问 → PeerJS server 地址为 localhost:9000
 *   局域网 IP 访问 → PeerJS server 地址为 同一个局域网 IP:9000
 */
export const DEFAULT_SERVER_CONFIG: PeerServerConfig = isGitHubPages
  ? { host: '0.peerjs.com', port: 443, path: '/', secure: true }
  : { host: location.hostname, port: 9000, path: '/cardgame', secure: false };

// ---- 房间发现 ----

export interface RoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
}
