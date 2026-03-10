/**
 * MQTT Subscriber
 *
 * Connects to MQTT broker and subscribes to device topics
 * Publishes raw messages to EventBus for processing
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { getConfig } from '../../config';
import { eventBus, SystemEvents } from '../event-bus';
import { Logger } from '../../utils/logger';
import { RawMQTTMessageEvent } from '../../types/event.types';

export class MQTTSubscriber {
  private client: MqttClient | null = null;
  private logger: Logger;
  private config = getConfig();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    this.logger = new Logger('MQTTSubscriber');
  }

  /**
   * Connect to MQTT broker and subscribe to topics
   */
  async connect(): Promise<void> {
    if (this.client) {
      this.logger.warn('Already connected to MQTT broker');
      return;
    }

    this.logger.info(`Connecting to MQTT broker: ${this.config.mqtt.brokerUrl}`);

    const options: IClientOptions = {
      clientId: this.config.mqtt.clientId,
      username: this.config.mqtt.username,
      password: this.config.mqtt.password,
      reconnectPeriod: this.config.mqtt.reconnectPeriod,
      connectTimeout: this.config.mqtt.connectTimeout,
      keepalive: this.config.mqtt.keepalive,
      clean: this.config.mqtt.clean,
    };

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info('Connected to MQTT broker');

        // Subscribe to topics
        this.subscribeToTopics()
          .then(() => resolve())
          .catch(reject);
      });

      this.client.on('message', (topic, payload, packet) => {
        this.handleMessage(topic, payload, packet);
      });

      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error', {
          error: error.message,
        });
        reject(error);
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
        this.logger.warn('Disconnected from MQTT broker');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        this.logger.info(`Reconnecting to MQTT broker (attempt ${this.reconnectAttempts})`);

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          this.logger.error('Max reconnection attempts reached');
          this.disconnect();
        }
      });
    });
  }

  /**
   * Subscribe to device topics
   */
  private async subscribeToTopics(): Promise<void> {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    const topics = [
      this.config.topics.v5008Upload,
      this.config.topics.v6800Upload,
    ];

    for (const topic of topics) {
      await new Promise<void>((resolve, reject) => {
        this.client!.subscribe(topic, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe to ${topic}`, {
              error: err.message,
            });
            reject(err);
          } else {
            this.logger.info(`Subscribed to: ${topic}`);
            resolve();
          }
        });
      });
    }
  }

  /**
   * Handle incoming MQTT message
   */
  private handleMessage(topic: string, payload: Buffer, packet: mqtt.IPublishPacket): void {
    this.logger.debug('Received MQTT message', {
      topic,
      payloadSize: payload.length,
      qos: packet.qos,
      retain: packet.retain,
    })

    const event: RawMQTTMessageEvent = {
      topic,
      payload,
      qos: packet.qos,
      retain: packet.retain,
      timestamp: new Date(),
    };

    // Publish to EventBus for processing
    eventBus.emit<RawMQTTMessageEvent>(SystemEvents.RAW_MQTT_MESSAGE, event);
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    this.logger.info('Disconnecting from MQTT broker...');

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
        this.isConnected = false;
        this.client = null;
        this.logger.info('Disconnected from MQTT broker');
        resolve();
      });
    });
  }

  /**
   * Check if connected to MQTT broker
   */
  isMqttConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      brokerUrl: this.config.mqtt.brokerUrl,
    };
  }
}

// Export singleton instance
export const mqttSubscriber = new MQTTSubscriber();
