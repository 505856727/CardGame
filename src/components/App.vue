<template>
  <div class="app">
    <header class="app-header">
      <h1>卡牌游戏中台</h1>
      <p class="subtitle">基于 PeerJS 的 P2P 卡牌游戏平台</p>
    </header>

    <main class="app-main">
      <Lobby
        v-if="!roomState"
        @create="handleCreate"
        @join="handleJoin"
      />
      <Room
        v-else
        :room-state="roomState"
        :role="role"
        :messages="messages"
        @leave="handleLeave"
        @send="handleSend"
      />
    </main>

    <p v-if="error" class="global-error">{{ error.message }}</p>
  </div>
</template>

<script setup lang="ts">
import Lobby from './Lobby.vue';
import Room from './Room.vue';
import { useRoom } from '@/composables/useRoom';

const {
  roomState,
  role,
  messages,
  error,
  createRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
} = useRoom();

async function handleCreate(playerName: string) {
  await createRoom(playerName);
}

async function handleJoin(roomId: string, playerName: string) {
  await joinRoom(roomId, playerName);
}

function handleLeave() {
  leaveRoom();
}

function handleSend(type: string, payload: unknown) {
  sendMessage(type, payload);
}
</script>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background: #11111b;
  color: #cdd6f4;
  min-height: 100vh;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-header h1 {
  font-size: 32px;
  color: #cdd6f4;
  margin-bottom: 8px;
}

.subtitle {
  color: #6c7086;
  font-size: 15px;
}

.app-main {
  min-height: 300px;
}

.global-error {
  margin-top: 24px;
  padding: 12px 16px;
  background: rgba(243, 139, 168, 0.12);
  border: 1px solid #f38ba8;
  border-radius: 8px;
  color: #f38ba8;
  text-align: center;
  font-size: 14px;
}
</style>
