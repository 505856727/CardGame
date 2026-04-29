<template>
  <div class="lobby">
    <!-- 邀请链接模式：简洁的加入界面 -->
    <template v-if="isInviteMode">
      <div class="invite-banner">
        <div class="invite-icon">&#127183;</div>
        <h2>你收到了一个游戏邀请</h2>
        <p class="invite-room-id">房间 ID: <code>{{ roomId }}</code></p>
      </div>

      <div class="form-group">
        <label>输入你的昵称即可加入</label>
        <input
          ref="inviteNameInput"
          v-model="playerName"
          type="text"
          placeholder="你的昵称"
          :disabled="loading"
          @keyup.enter="handleJoin"
        />
      </div>

      <button
        class="btn btn-primary btn-block"
        :disabled="!playerName.trim() || loading"
        @click="handleJoin"
      >
        {{ loading ? '加入中...' : '立即加入' }}
      </button>

      <button class="btn btn-link" :disabled="loading" @click="exitInviteMode">
        返回大厅
      </button>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </template>

    <!-- 普通大厅模式 -->
    <template v-else>
      <h2>游戏大厅</h2>

      <div class="form-group">
        <label>玩家昵称</label>
        <input
          v-model="playerName"
          type="text"
          placeholder="输入你的昵称"
          :disabled="loading"
        />
      </div>

      <div class="actions">
        <button
          class="btn btn-primary"
          :disabled="!playerName.trim() || loading"
          @click="handleCreate"
        >
          {{ loading && mode === 'create' ? '创建中...' : '创建房间' }}
        </button>

        <div class="divider">或</div>

        <div class="join-group">
          <input
            v-model="roomId"
            type="text"
            placeholder="输入房间 ID"
            :disabled="loading"
          />
          <button
            class="btn btn-secondary"
            :disabled="!playerName.trim() || !roomId.trim() || loading"
            @click="handleJoin"
          >
            {{ loading && mode === 'join' ? '加入中...' : '加入房间' }}
          </button>
        </div>
      </div>

      <!-- 房间列表 -->
      <div class="room-list-section">
        <div class="room-list-header">
          <h3>在线房间</h3>
          <button
            class="btn btn-sm btn-outline"
            :disabled="discovering"
            @click="$emit('refresh')"
          >
            {{ discovering ? '搜索中...' : '刷新列表' }}
          </button>
        </div>

        <div v-if="rooms.length > 0" class="room-list">
          <div
            v-for="room in rooms"
            :key="room.roomId"
            class="room-card"
            @click="selectRoom(room.roomId)"
          >
            <div class="room-card-info">
              <span class="room-host">{{ room.hostName }} 的房间</span>
              <span class="room-id-label">{{ room.roomId }}</span>
            </div>
            <div class="room-card-meta">
              <span class="player-count">{{ room.playerCount }} 人</span>
              <button
                class="btn btn-sm btn-secondary"
                :disabled="!playerName.trim() || loading"
                @click.stop="handleJoinRoom(room.roomId)"
              >
                加入
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-rooms">
          <p v-if="discovering">正在搜索房间...</p>
          <p v-else-if="isPublicServer">公共服务器不支持房间列表，请通过房间 ID 或邀请链接加入</p>
          <p v-else>暂无在线房间，点击"刷新列表"搜索或创建一个新房间</p>
        </div>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { RoomInfo } from '@/core/types';
import { DEFAULT_SERVER_CONFIG } from '@/core/types';

const props = defineProps<{
  rooms: RoomInfo[];
  discovering: boolean;
  initialRoomId?: string;
  onCreate: (playerName: string) => Promise<unknown>;
  onJoin: (roomId: string, playerName: string) => Promise<unknown>;
}>();

defineEmits<{
  refresh: [];
}>();

const isPublicServer = computed(() => DEFAULT_SERVER_CONFIG.host === '0.peerjs.com');
const isInviteMode = ref(!!props.initialRoomId);
const inviteNameInput = ref<HTMLInputElement | null>(null);

const playerName = ref('');
const roomId = ref(props.initialRoomId ?? '');
const loading = ref(false);
const mode = ref<'create' | 'join' | null>(null);
const errorMsg = ref('');

onMounted(async () => {
  await nextTick();
  inviteNameInput.value?.focus();
});

function exitInviteMode() {
  isInviteMode.value = false;
  roomId.value = '';
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState({}, '', url.toString());
}

function selectRoom(id: string) {
  roomId.value = id;
}

function handleJoinRoom(id: string) {
  roomId.value = id;
  handleJoin();
}

async function handleCreate() {
  if (!playerName.value.trim()) return;
  mode.value = 'create';
  loading.value = true;
  errorMsg.value = '';
  try {
    await props.onCreate(playerName.value.trim());
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function handleJoin() {
  if (!playerName.value.trim() || !roomId.value.trim()) return;
  mode.value = 'join';
  loading.value = true;
  errorMsg.value = '';
  try {
    await props.onJoin(roomId.value.trim(), playerName.value.trim());
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.lobby {
  max-width: 520px;
  margin: 0 auto;
  padding: 32px;
  background: #1e1e2e;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

h2 {
  text-align: center;
  margin: 0 0 24px;
  color: #cdd6f4;
  font-size: 24px;
}

/* 邀请模式 */
.invite-banner {
  text-align: center;
  margin-bottom: 28px;
}

.invite-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.invite-banner h2 {
  margin-bottom: 12px;
  font-size: 22px;
}

.invite-room-id {
  color: #6c7086;
  font-size: 14px;
}

.invite-room-id code {
  background: #313244;
  padding: 2px 8px;
  border-radius: 4px;
  color: #89b4fa;
  font-size: 13px;
}

.btn-block {
  width: 100%;
  margin-top: 4px;
}

.btn-link {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  background: none;
  border: none;
  color: #6c7086;
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  transition: color 0.2s;
}

.btn-link:hover {
  color: #a6adc8;
}

/* 通用 */
.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 6px;
  color: #a6adc8;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 10px 14px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus {
  border-color: #89b4fa;
}

input::placeholder {
  color: #6c7086;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #89b4fa;
  color: #1e1e2e;
}

.btn-primary:hover:not(:disabled) {
  background: #74c7ec;
}

.btn-secondary {
  background: #a6e3a1;
  color: #1e1e2e;
  flex-shrink: 0;
}

.btn-secondary:hover:not(:disabled) {
  background: #94e2d5;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn-outline {
  background: transparent;
  border: 1px solid #45475a;
  color: #a6adc8;
}

.btn-outline:hover:not(:disabled) {
  border-color: #89b4fa;
  color: #89b4fa;
}

.divider {
  text-align: center;
  color: #6c7086;
  font-size: 13px;
}

.join-group {
  display: flex;
  gap: 8px;
}

.join-group input {
  flex: 1;
}

/* 房间列表 */
.room-list-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #313244;
}

.room-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.room-list-header h3 {
  margin: 0;
  color: #cdd6f4;
  font-size: 16px;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.room-card:hover {
  border-color: #89b4fa;
  background: #3b3c52;
}

.room-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-host {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 500;
}

.room-id-label {
  color: #6c7086;
  font-size: 12px;
  font-family: monospace;
}

.room-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-count {
  color: #a6adc8;
  font-size: 13px;
}

.empty-rooms {
  text-align: center;
  padding: 24px 0;
  color: #6c7086;
  font-size: 14px;
}

.empty-rooms p {
  margin: 0;
}

.error {
  margin-top: 16px;
  padding: 10px 14px;
  background: rgba(243, 139, 168, 0.15);
  border: 1px solid #f38ba8;
  border-radius: 8px;
  color: #f38ba8;
  font-size: 13px;
}
</style>
