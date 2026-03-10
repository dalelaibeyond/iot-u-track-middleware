/**
 * Event Bus Implementation
 *
 * Central event communication system using Node.js EventEmitter
 * Implements the IEventBus interface from event.types
 */

import { EventEmitter } from 'events';
import { IEventBus, EventHandler, SystemEvents } from '../../types/event.types';
import { Logger } from '../../utils/logger';

interface HandlerInfo<T> {
  handler: EventHandler<T>;
  priority: number;
}

/**
 * Event Bus
 * Central pub/sub system for decoupled communication between components
 * Supports prioritized handlers and stopPropagation for SUOMessageEvent
 */
export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private logger: Logger;
  private static instance: EventBus | null = null;
  private prioritizedHandlers: Map<string, HandlerInfo<unknown>[]> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    this.logger = new Logger('EventBus');

    // Set max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(100);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  on<T>(event: string, handler: EventHandler<T>): void {
    this.emitter.on(event, handler);
    this.logger.debug(`Subscribed to event: ${event}`);
  }

  /**
   * Subscribe to an event with priority (higher priority = called first)
   * Priority 0 is default, higher numbers run first
   */
  onWithPriority<T>(event: string, handler: EventHandler<T>, priority: number = 0): void {
    if (!this.prioritizedHandlers.has(event)) {
      this.prioritizedHandlers.set(event, []);
    }

    const handlers = this.prioritizedHandlers.get(event)!;
    handlers.push({ handler: handler as EventHandler<unknown>, priority });

    // Sort by priority (highest first)
    handlers.sort((a, b) => b.priority - a.priority);

    this.logger.debug(`Subscribed to event with priority ${priority}: ${event}`);
  }

  /**
   * Unsubscribe from an event with priority
   */
  offWithPriority<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.prioritizedHandlers.get(event);
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    this.logger.debug(`Unsubscribed from event with priority: ${event}`);
  }

  /**
   * Unsubscribe from an event
   */
  off<T>(event: string, handler: EventHandler<T>): void {
    this.emitter.off(event, handler);
    this.logger.debug(`Unsubscribed from event: ${event}`);
  }

  /**
   * Emit an event with stopPropagation support
   * For SUO_MQTT_MESSAGE events, handlers can call stopPropagation() to prevent
   * further processing by other handlers (e.g., SmartHB filtering incomplete messages)
   */
  emit<T>(event: string, payload: T): void {
    // Check if this event type has prioritized handlers
    const prioritized = this.prioritizedHandlers.get(event);

    if (prioritized && prioritized.length > 0) {
      // For SUO_MQTT_MESSAGE or similar events that need stopPropagation
      let isStopped = false;
      const stopPropagation = () => {
        isStopped = true;
      };
      const isPropagationStopped = () => isStopped;

      // Create wrapped payload with stopPropagation methods
      const wrappedPayload = {
        ...(payload as Record<string, unknown>),
        stopPropagation,
        isPropagationStopped,
      };

      // Call prioritized handlers first (in priority order)
      for (const { handler } of prioritized) {
        if (!isStopped) {
          try {
            (handler as EventHandler<Record<string, unknown>>)(wrappedPayload);
          } catch (error) {
            this.logger.error(`Error in prioritized handler for ${event}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // If not stopped, emit to regular handlers
      if (!isStopped) {
        this.emitter.emit(event, wrappedPayload as T);
      } else {
        this.logger.debug(`Event propagation stopped for: ${event}`);
      }
    } else {
      // Standard emit without priority handling
      this.emitter.emit(event, payload);
    }

    this.logger.debug(`Emitted event: ${event}`);
  }

  /**
   * Subscribe to an event once
   */
  once<T>(event: string, handler: EventHandler<T>): void {
    this.emitter.once(event, handler);
    this.logger.debug(`Subscribed once to event: ${event}`);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.emitter.removeAllListeners(event);
      this.logger.debug(`Removed all listeners for event: ${event}`);
    } else {
      this.emitter.removeAllListeners();
      this.logger.debug('Removed all listeners for all events');
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    if (EventBus.instance) {
      EventBus.instance.removeAllListeners();
      EventBus.instance = null;
    }
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Re-export SystemEvents for convenience
export { SystemEvents };
