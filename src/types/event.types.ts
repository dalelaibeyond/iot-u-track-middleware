/**
 * Event Type Definitions
 *
 * Type definitions for the event-driven architecture.
 * Based on specs/architecture.md event system.
 */

import { SIFMessage } from './sif.types';
import { AnySUOMessage } from './suo.types';

/**
 * Event Handler Type
 */
export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * Event Bus Interface
 * Central event communication system
 */
export interface IEventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, payload: T): void;
  once<T>(event: string, handler: EventHandler<T>): void;
  removeAllListeners(event?: string): void;
}

/**
 * System Events
 * All event names used in the system
 */
export const SystemEvents = {
  // MQTT Events
  RAW_MQTT_MESSAGE: 'raw.mqtt.message',

  // Processing Events
  SIF_MESSAGE: 'sif.message',
  SUO_MQTT_MESSAGE: 'suo.mqtt.message',

  // Command Events
  COMMAND_REQUEST: 'command.request',
  COMMAND_PUBLISH: 'command.publish',

  // Module Events
  MODULE_STATUS_CHANGED: 'module.status.changed',
  MODULE_ERROR: 'module.error',

  // System Events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_SHUTDOWN: 'system.shutdown',
} as const;

/**
 * Raw MQTT Message Event
 * Emitted by: MQTTSubscriber
 * Consumed by: MessageParser
 */
export interface RawMQTTMessageEvent {
  topic: string;
  payload: Buffer;
  qos: number;
  retain: boolean;
  timestamp: Date;
}

/**
 * SIF Message Event
 * Emitted by: MessageParser
 * Consumed by: Normalizer
 */
export interface SIFMessageEvent {
  message: SIFMessage;
  raw: RawMQTTMessageEvent;
}

/**
 * SUO Message Event
 * Emitted by: Normalizer
 * Consumed by: Cache, Database Writer, Relay, WebSocket, Webhook, SmartHB
 */
export interface SUOMessageEvent {
  message: AnySUOMessage;
  sif: SIFMessage;
  /**
   * Call this to prevent further propagation to other handlers.
   * Used by SmartHB to filter out incomplete SUO_DEV_MOD messages.
   */
  stopPropagation?: () => void;
  /**
   * Returns true if propagation has been stopped.
   */
  isPropagationStopped?: () => boolean;
}

/**
 * Command Request Event
 * Emitted by: ApiService
 * Consumed by: CommandService
 */
export interface CommandRequestEvent {
  commandId: string;
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  messageType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Command Publish Event
 * Emitted by: CommandService
 * Consumed by: MQTTPublisher
 */
export interface CommandPublishEvent {
  commandId: string;
  topic: string;
  payload: Buffer | string;
  qos: number;
  timestamp: Date;
}

/**
 * Module Status Changed Event
 * Emitted by: ModuleManager
 * Consumed by: Monitoring, Logging
 */
export interface ModuleStatusChangedEvent {
  moduleName: string;
  status: ModuleStatus;
  timestamp: Date;
}

/**
 * Module Status
 */
export interface ModuleStatus {
  name: string;
  enabled: boolean;
  running: boolean;
  lastError?: Error;
  metrics: Record<string, number | string>;
}

/**
 * Module Error Event
 * Emitted by: Any module
 * Consumed by: Error handler, Logging
 */
export interface ModuleErrorEvent {
  moduleName: string;
  error: Error;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * System Error Event
 * Emitted by: System
 * Consumed by: Error handler, Monitoring
 */
export interface SystemErrorEvent {
  error: Error;
  component: string;
  fatal: boolean;
  timestamp: Date;
}

/**
 * Event Type Mapping
 * Maps event names to their payload types
 */
export interface EventTypeMap {
  [SystemEvents.RAW_MQTT_MESSAGE]: RawMQTTMessageEvent;
  [SystemEvents.SIF_MESSAGE]: SIFMessageEvent;
  [SystemEvents.SUO_MQTT_MESSAGE]: SUOMessageEvent;
  [SystemEvents.COMMAND_REQUEST]: CommandRequestEvent;
  [SystemEvents.COMMAND_PUBLISH]: CommandPublishEvent;
  [SystemEvents.MODULE_STATUS_CHANGED]: ModuleStatusChangedEvent;
  [SystemEvents.MODULE_ERROR]: ModuleErrorEvent;
  [SystemEvents.SYSTEM_ERROR]: SystemErrorEvent;
}

/**
 * Type-safe event emitter helper
 * Usage: eventBus.emit(SystemEvents.SUO_MQTT_MESSAGE, { message, sif })
 */
export type TypedEventEmitter = {
  emit<K extends keyof EventTypeMap>(event: K, payload: EventTypeMap[K]): void;
  on<K extends keyof EventTypeMap>(event: K, handler: EventHandler<EventTypeMap[K]>): void;
  off<K extends keyof EventTypeMap>(event: K, handler: EventHandler<EventTypeMap[K]>): void;
  once<K extends keyof EventTypeMap>(event: K, handler: EventHandler<EventTypeMap[K]>): void;
};
