import { ref, readonly, onUnmounted, shallowRef } from 'vue';
import { PeerService } from '@/core/PeerService';
import { MessageBus } from '@/core/MessageBus';
import { RoomManager, getReconnectData } from '@/core/RoomManager';
import { RoomDiscovery } from '@/core/RoomDiscovery';
import { RoomRole, type GameMessage, type RoomState, type RoomInfo } from '@/core/types';

const peerService = new PeerService();
const messageBus = new MessageBus();
const roomManager = new RoomManager(peerService, messageBus);
const roomDiscovery = new RoomDiscovery(peerService, roomManager);

export function useRoom() {
  const roomState = shallowRef<RoomState | null>(null);
  const role = ref<RoomRole>(RoomRole.None);
  const messages = ref<GameMessage[]>([]);
  const error = ref<Error | null>(null);
  const availableRooms = ref<RoomInfo[]>([]);
  const discovering = ref(false);

  const unsubState = roomManager.onRoomStateChange((state) => {
    roomState.value = { ...state };
    role.value = roomManager.role;
  });

  const unsubMessages = (() => {
    messageBus.on('*', (msg: GameMessage) => {
      messages.value = [...messages.value, msg];
    });
    return () => messageBus.off('*', () => {});
  })();

  onUnmounted(() => {
    unsubState();
    unsubMessages();
  });

  async function createRoom(playerName: string) {
    error.value = null;
    try {
      const state = await roomManager.createRoom(playerName);
      roomState.value = { ...state };
      role.value = RoomRole.Host;
      return state;
    } catch (e) {
      error.value = e as Error;
      throw e;
    }
  }

  async function joinRoom(roomId: string, playerName: string) {
    error.value = null;
    try {
      const state = await roomManager.joinRoom(roomId, playerName);
      roomState.value = { ...state };
      role.value = RoomRole.Client;
      return state;
    } catch (e) {
      error.value = e as Error;
      throw e;
    }
  }

  function leaveRoom() {
    roomManager.leaveRoom();
    roomState.value = null;
    role.value = RoomRole.None;
    messages.value = [];
    error.value = null;
  }

  function sendMessage(type: string, payload: unknown) {
    roomManager.sendMessage(type, payload);
  }

  async function tryReconnect(): Promise<boolean> {
    const data = getReconnectData();
    if (!data) return false;
    try {
      if (data.role === RoomRole.Host) {
        await createRoom(data.playerName);
      } else {
        await joinRoom(data.roomId, data.playerName);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function refreshRooms() {
    discovering.value = true;
    error.value = null;
    try {
      availableRooms.value = await roomDiscovery.discoverRooms();
    } catch (e) {
      error.value = e as Error;
    } finally {
      discovering.value = false;
    }
  }

  return {
    roomManager,
    messageBus,
    roomState: readonly(roomState),
    role: readonly(role),
    messages: readonly(messages),
    error: readonly(error),
    availableRooms: readonly(availableRooms),
    discovering: readonly(discovering),
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    tryReconnect,
    refreshRooms,
  };
}
