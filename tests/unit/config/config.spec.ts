/**
 * Configuration Tests
 *
 * Tests for configuration loading and defaults
 */

import { getConfig, resetConfig, AppConfig } from '../../../src/config';

describe('Configuration', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  describe('smartHB module configuration', () => {
    it('should have smartHB config with correct defaults', () => {
      const config = getConfig();

      expect(config.modules).toBeDefined();
      expect(config.modules.smartHB).toBeDefined();
      expect(config.modules.smartHB.enabled).toBe(true);
      expect(config.modules.smartHB.config).toBeDefined();
      expect(config.modules.smartHB.config.queryCooldown).toBe(300000);
      expect(config.modules.smartHB.config.triggerOnHeartbeat).toBe(true);
    });

    it('should allow overriding smartHB config via environment variables', () => {
      process.env.MODULE_SMART_HB_ENABLED = 'false';
      process.env.MODULE_SMART_HB_QUERY_COOLDOWN = '60000';
      process.env.MODULE_SMART_HB_TRIGGER_ON_HEARTBEAT = 'false';

      resetConfig();
      const config = getConfig();

      expect(config.modules.smartHB.enabled).toBe(false);
      expect(config.modules.smartHB.config.queryCooldown).toBe(60000);
      expect(config.modules.smartHB.config.triggerOnHeartbeat).toBe(false);

      // Clean up
      delete process.env.MODULE_SMART_HB_ENABLED;
      delete process.env.MODULE_SMART_HB_QUERY_COOLDOWN;
      delete process.env.MODULE_SMART_HB_TRIGGER_ON_HEARTBEAT;
    });
  });

  describe('protocolAdapter module configuration', () => {
    it('should have protocolAdapter config with correct defaults', () => {
      const config = getConfig();

      expect(config.modules).toBeDefined();
      expect(config.modules.protocolAdapter).toBeDefined();
      expect(config.modules.protocolAdapter.enabled).toBe(true);
      expect(config.modules.protocolAdapter.config).toBeDefined();
      expect(config.modules.protocolAdapter.config.deduplicationWindow).toBe(1000);
    });

    it('should allow overriding protocolAdapter config via environment variables', () => {
      process.env.MODULE_PROTOCOL_ADAPTER_ENABLED = 'false';
      process.env.MODULE_PROTOCOL_ADAPTER_DEDUP_WINDOW = '2000';

      resetConfig();
      const config = getConfig();

      expect(config.modules.protocolAdapter.enabled).toBe(false);
      expect(config.modules.protocolAdapter.config.deduplicationWindow).toBe(2000);

      // Clean up
      delete process.env.MODULE_PROTOCOL_ADAPTER_ENABLED;
      delete process.env.MODULE_PROTOCOL_ADAPTER_QUERY_TIMEOUT;
      delete process.env.MODULE_PROTOCOL_ADAPTER_DEDUP_WINDOW;
    });
  });

  describe('configuration validation', () => {
    it('should return the same config instance on multiple calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should reset config when resetConfig is called', () => {
      const config1 = getConfig();
      resetConfig();
      const config2 = getConfig();

      expect(config1).not.toBe(config2);
      expect(config2.modules.smartHB.enabled).toBe(config1.modules.smartHB.enabled);
    });

    it('should throw error for invalid port range (0)', () => {
      process.env.PORT = '0';
      resetConfig();

      expect(() => getConfig()).toThrow('PORT must be between 1 and 65535');

      delete process.env.PORT;
    });

    it('should throw error for invalid port range (> 65535)', () => {
      process.env.PORT = '70000';
      resetConfig();

      expect(() => getConfig()).toThrow('PORT must be between 1 and 65535');

      delete process.env.PORT;
    });

    it('should throw error for invalid API port range', () => {
      process.env.API_PORT = '99999';
      resetConfig();

      expect(() => getConfig()).toThrow('API_PORT must be between 1 and 65535');

      delete process.env.API_PORT;
    });

    it('should throw error for invalid WebSocket port range', () => {
      process.env.OUTPUT_WEBSOCKET_PORT = '-1';
      resetConfig();

      expect(() => getConfig()).toThrow('OUTPUT_WEBSOCKET_PORT must be between 1 and 65535');

      delete process.env.OUTPUT_WEBSOCKET_PORT;
    });

    it('should use default when MQTT_BROKER_URL is empty', () => {
      process.env.MQTT_BROKER_URL = '';
      resetConfig();

      const config = getConfig();
      expect(config.mqtt.brokerUrl).toBe('mqtt://localhost:1883');

      delete process.env.MQTT_BROKER_URL;
    });

    it('should accept valid port values at boundaries', () => {
      process.env.PORT = '1';
      process.env.API_PORT = '65535';
      resetConfig();

      const config = getConfig();
      expect(config.port).toBe(1);
      expect(config.api.port).toBe(65535);

      delete process.env.PORT;
      delete process.env.API_PORT;
    });

    it('should handle multiple validation errors in one message', () => {
      process.env.PORT = '0';
      process.env.API_PORT = '99999';
      process.env.OUTPUT_WEBSOCKET_PORT = '-1';
      resetConfig();

      let error: Error | null = null;
      try {
        getConfig();
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/PORT must be between 1 and 65535/);
      expect(error!.message).toMatch(/API_PORT must be between 1 and 65535/);
      expect(error!.message).toMatch(/OUTPUT_WEBSOCKET_PORT must be between 1 and 65535/);

      delete process.env.PORT;
      delete process.env.API_PORT;
      delete process.env.OUTPUT_WEBSOCKET_PORT;
    });
  });
});
