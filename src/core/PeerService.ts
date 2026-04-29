import { Peer, type DataConnection } from 'peerjs';
import { PeerStatus, type PeerConnection } from './types';

type StatusChangeCallback = (status: PeerStatus) => void;
type ConnectionCallback = (conn: PeerConnection) => void;
type ErrorCallback = (err: Error) => void;

export class PeerService {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private statusListeners = new Set<StatusChangeCallback>();
  private connectionListeners = new Set<ConnectionCallback>();
  private errorListeners = new Set<ErrorCallback>();
  private dataListeners = new Set<(peerId: string, data: unknown) => void>();

  private _status: PeerStatus = PeerStatus.Disconnected;
  private _peerId: string | null = null;

  get status(): PeerStatus {
    return this._status;
  }

  get peerId(): string | null {
    return this._peerId;
  }

  get activeConnections(): Map<string, DataConnection> {
    return this.connections;
  }

  init(customId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.peer) {
        this.destroy();
      }

      this.setStatus(PeerStatus.Connecting);

      this.peer = customId ? new Peer(customId) : new Peer();

      this.peer.on('open', (id) => {
        this._peerId = id;
        this.setStatus(PeerStatus.Connected);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        this.setStatus(PeerStatus.Error);
        this.errorListeners.forEach((l) => l(err));
        reject(err);
      });

      this.peer.on('disconnected', () => {
        this.setStatus(PeerStatus.Disconnected);
      });

      this.peer.on('close', () => {
        this._peerId = null;
        this.setStatus(PeerStatus.Disconnected);
      });
    });
  }

  connectTo(remotePeerId: string): Promise<DataConnection> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }

      const conn = this.peer.connect(remotePeerId, { reliable: true });

      conn.on('open', () => {
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on('error', (err) => {
        reject(err);
      });
    });
  }

  send(peerId: string, data: unknown): void {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  broadcast(data: unknown): void {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  disconnect(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  destroy(): void {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this._peerId = null;
    this.setStatus(PeerStatus.Disconnected);
  }

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onConnection(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  onData(callback: (peerId: string, data: unknown) => void): () => void {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  private setupConnection(conn: DataConnection): void {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);

    this.connectionListeners.forEach((l) =>
      l({ peerId, connection: conn }),
    );

    conn.on('data', (data) => {
      this.dataListeners.forEach((l) => l(peerId, data));
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
    });

    conn.on('error', (err) => {
      this.errorListeners.forEach((l) => l(err));
    });
  }

  private setStatus(status: PeerStatus): void {
    this._status = status;
    this.statusListeners.forEach((l) => l(status));
  }
}
