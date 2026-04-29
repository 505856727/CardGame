<template>
  <div class="lobby">
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

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  create: [playerName: string];
  join: [roomId: string, playerName: string];
}>();

const playerName = ref('');
const roomId = ref('');
const loading = ref(false);
const mode = ref<'create' | 'join' | null>(null);
const errorMsg = ref('');

async function handleCreate() {
  mode.value = 'create';
  loading.value = true;
  errorMsg.value = '';
  try {
    emit('create', playerName.value.trim());
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function handleJoin() {
  mode.value = 'join';
  loading.value = true;
  errorMsg.value = '';
  try {
    emit('join', roomId.value.trim(), playerName.value.trim());
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.lobby {
  max-width: 420px;
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
