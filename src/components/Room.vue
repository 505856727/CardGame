<template>
  <div class="room">
    <div class="room-header">
      <div class="room-info">
        <h2>房间</h2>
        <span class="room-id" @click="copyRoomId">
          ID: {{ roomState?.roomId }}
          <span class="copy-hint">点击复制</span>
        </span>
        <span class="role-badge" :class="role">
          {{ role === 'host' ? '房主' : '玩家' }}
        </span>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline-light" @click="copyInviteLink">复制邀请链接</button>
        <button class="btn btn-danger" @click="$emit('leave')">离开房间</button>
      </div>
    </div>

    <!-- 分享提示横幅（房主首次进入时显示） -->
    <div v-if="showShareBanner && role === 'host'" class="share-banner">
      <div class="share-banner-text">
        <strong>房间已创建！</strong> 分享下面的链接邀请好友加入：
      </div>
      <div class="share-link-row">
        <input
          class="share-link-input"
          :value="inviteLink"
          readonly
          @click="($event.target as HTMLInputElement).select()"
        />
        <button class="btn btn-primary btn-sm" @click="copyInviteLinkAndHint">
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
      <button class="share-banner-close" @click="showShareBanner = false">&times;</button>
    </div>

    <div class="room-body">
      <div class="players-panel">
        <h3>玩家列表 ({{ roomState?.players.length || 0 }})</h3>
        <ul class="player-list">
          <li
            v-for="player in roomState?.players"
            :key="player.id"
            class="player-item"
          >
            <span class="player-dot" />
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.id === roomState?.hostId" class="host-tag">房主</span>
          </li>
        </ul>
      </div>

      <div class="chat-panel">
        <h3>消息</h3>
        <div ref="messageListRef" class="message-list">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="message-item"
          >
            <span class="msg-type">{{ msg.type }}</span>
            <span class="msg-content">{{ formatPayload(msg.payload) }}</span>
          </div>
          <div v-if="!messages.length" class="empty-hint">暂无消息</div>
        </div>

        <div class="send-bar">
          <input
            v-model="msgInput"
            type="text"
            placeholder="输入消息..."
            @keyup.enter="handleSend"
          />
          <button
            class="btn btn-primary"
            :disabled="!msgInput.trim()"
            @click="handleSend"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { GameMessage, RoomState } from '@/core/types';
import { type RoomRole } from '@/core/types';

const props = defineProps<{
  roomState: RoomState | null;
  role: RoomRole;
  messages: GameMessage[];
}>();

const emit = defineEmits<{
  leave: [];
  send: [type: string, payload: unknown];
}>();

const msgInput = ref('');
const messageListRef = ref<HTMLElement | null>(null);
const showShareBanner = ref(true);
const copied = ref(false);

const inviteLink = (() => {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  if (props.roomState?.roomId) {
    url.searchParams.set('room', props.roomState.roomId);
  }
  return url.toString();
})();

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  },
);

function handleSend() {
  const text = msgInput.value.trim();
  if (!text) return;
  emit('send', 'chat:message', { text });
  msgInput.value = '';
}

function formatPayload(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  try {
    const obj = payload as Record<string, unknown>;
    if (obj.text) return String(obj.text);
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function copyRoomId() {
  if (props.roomState?.roomId) {
    navigator.clipboard.writeText(props.roomState.roomId);
  }
}

function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink);
}

function copyInviteLinkAndHint() {
  navigator.clipboard.writeText(inviteLink);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<style scoped>
.room {
  max-width: 800px;
  margin: 0 auto;
  background: #1e1e2e;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

h2 {
  margin: 0;
  color: #cdd6f4;
  font-size: 20px;
}

.room-id {
  color: #6c7086;
  font-size: 13px;
  font-family: monospace;
  cursor: pointer;
  position: relative;
}

.copy-hint {
  display: none;
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: #45475a;
  color: #cdd6f4;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
}

.room-id:hover .copy-hint {
  display: block;
}

.role-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.role-badge.host {
  background: rgba(250, 179, 135, 0.2);
  color: #fab387;
}

.role-badge.client {
  background: rgba(137, 180, 250, 0.2);
  color: #89b4fa;
}

/* 分享横幅 */
.share-banner {
  position: relative;
  padding: 16px 40px 16px 20px;
  background: rgba(137, 180, 250, 0.1);
  border-bottom: 1px solid rgba(137, 180, 250, 0.2);
}

.share-banner-text {
  color: #cdd6f4;
  font-size: 14px;
  margin-bottom: 10px;
}

.share-banner-text strong {
  color: #a6e3a1;
}

.share-link-row {
  display: flex;
  gap: 8px;
}

.share-link-input {
  flex: 1;
  padding: 8px 12px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 6px;
  color: #89b4fa;
  font-size: 13px;
  font-family: monospace;
  outline: none;
  cursor: text;
}

.share-link-input:focus {
  border-color: #89b4fa;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.share-banner-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: none;
  border: none;
  color: #6c7086;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}

.share-banner-close:hover {
  color: #cdd6f4;
}

.room-body {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 400px;
}

.players-panel {
  padding: 16px;
  border-right: 1px solid #313244;
}

.players-panel h3 {
  margin: 0 0 12px;
  color: #a6adc8;
  font-size: 14px;
}

.player-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #cdd6f4;
  font-size: 14px;
}

.player-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a6e3a1;
  flex-shrink: 0;
}

.player-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-tag {
  font-size: 11px;
  color: #fab387;
  background: rgba(250, 179, 135, 0.15);
  padding: 1px 6px;
  border-radius: 4px;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.chat-panel h3 {
  margin: 0 0 12px;
  color: #a6adc8;
  font-size: 14px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  max-height: 320px;
}

.message-item {
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #313244;
}

.msg-type {
  color: #89b4fa;
  margin-right: 8px;
  font-family: monospace;
  font-size: 12px;
}

.msg-content {
  color: #cdd6f4;
}

.empty-hint {
  text-align: center;
  color: #6c7086;
  padding: 40px 0;
  font-size: 14px;
}

.send-bar {
  display: flex;
  gap: 8px;
}

.send-bar input {
  flex: 1;
  padding: 10px 14px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
  font-size: 14px;
  outline: none;
}

.send-bar input:focus {
  border-color: #89b4fa;
}

.send-bar input::placeholder {
  color: #6c7086;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-outline-light {
  background: transparent;
  border: 1px solid #45475a;
  color: #a6adc8;
}

.btn-outline-light:hover {
  border-color: #89b4fa;
  color: #89b4fa;
}

.btn-danger {
  background: rgba(243, 139, 168, 0.2);
  color: #f38ba8;
}

.btn-danger:hover {
  background: rgba(243, 139, 168, 0.3);
}

h3 {
  color: #a6adc8;
}
</style>
