import type { GameMessage, MessageHandler } from './types';

export class MessageBus {
  private handlers = new Map<string, Set<MessageHandler>>();

  on<T = unknown>(type: string, handler: MessageHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);
  }

  off<T = unknown>(type: string, handler: MessageHandler<T>): void {
    this.handlers.get(type)?.delete(handler as MessageHandler);
  }

  emit(message: GameMessage): void {
    this.handlers.get(message.type)?.forEach((h) => h(message));
    // 通配符监听器收到所有消息
    this.handlers.get('*')?.forEach((h) => h(message));
  }

  clear(): void {
    this.handlers.clear();
  }
}
