import { PeerService } from './PeerService';
import { RoomManager } from './RoomManager';
import { ROOM_ID_PREFIX, type RoomInfo } from './types';

export class RoomDiscovery {
  private peerService: PeerService;
  private roomManager: RoomManager;

  constructor(peerService: PeerService, roomManager: RoomManager) {
    this.peerService = peerService;
    this.roomManager = roomManager;
  }

  /**
   * 发现所有可用房间。
   * 1. 通过 PeerJS server 的 listAllPeers 获取所有 peer ID
   * 2. 筛选出以房间前缀开头的 peer
   * 3. 逐个查询房间元数据
   */
  async discoverRooms(): Promise<RoomInfo[]> {
    // 需要一个临时 peer 来调用 listAllPeers
    const tmpPeer = new PeerService();
    try {
      await tmpPeer.init();
      const allPeers = await tmpPeer.listAllPeers();
      tmpPeer.destroy();

      const roomPeerIds = allPeers.filter((id) => id.startsWith(ROOM_ID_PREFIX));

      if (roomPeerIds.length === 0) return [];

      const results = await Promise.allSettled(
        roomPeerIds.map((id) => this.roomManager.queryRoomInfo(id)),
      );

      return results
        .filter(
          (r): r is PromiseFulfilledResult<RoomInfo | null> =>
            r.status === 'fulfilled' && r.value !== null,
        )
        .map((r) => r.value!);
    } catch {
      tmpPeer.destroy();
      return [];
    }
  }
}
