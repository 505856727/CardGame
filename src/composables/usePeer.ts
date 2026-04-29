import { ref, readonly, onUnmounted } from 'vue';
import { PeerService } from '@/core/PeerService';
import { PeerStatus } from '@/core/types';

const peerService = new PeerService();

export function usePeer() {
  const peerId = ref<string | null>(null);
  const status = ref<PeerStatus>(PeerStatus.Disconnected);
  const error = ref<Error | null>(null);

  const unsubStatus = peerService.onStatusChange((s) => {
    status.value = s;
    peerId.value = peerService.peerId;
  });

  const unsubError = peerService.onError((e) => {
    error.value = e;
  });

  onUnmounted(() => {
    unsubStatus();
    unsubError();
  });

  async function connect(customId?: string) {
    error.value = null;
    try {
      const id = await peerService.init(customId);
      peerId.value = id;
      return id;
    } catch (e) {
      error.value = e as Error;
      throw e;
    }
  }

  function disconnect() {
    peerService.destroy();
    peerId.value = null;
    error.value = null;
  }

  return {
    peerService,
    peerId: readonly(peerId),
    status: readonly(status),
    error: readonly(error),
    connect,
    disconnect,
  };
}
