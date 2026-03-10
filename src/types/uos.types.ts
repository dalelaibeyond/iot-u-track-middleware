/**
 * UOS (Unified Object State) Cache Type Definitions
 *
 * Based on: SUO_UOS_DB_Spec.md Section 5
 *
 * UOS maintains in-memory cache of unified device/module state,
 * aggregating data from multiple SUO message types.
 */

/**
 * Unified Module Telemetry State
 * Aggregates all sensor data for a single module with per-data-type timestamps
 *
 * Reference: SUO_UOS_DB_Spec.md Section 5.3.1
 */
export interface ModuleTelemetry {
  // Identification
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  moduleIndex: number;
  moduleId: string;

  // Status
  isOnline: boolean;
  lastSeenHb: string | null; // ISO8601 - Last heartbeat timestamp
  uTotal: number | null; // Total RFID slots (from HEARTBEAT)

  // Temperature & Humidity
  tempHum: Array<{
    sensorIndex: number;
    temp: number | null;
    hum: number | null;
  }>;
  lastSeenTh: string | null; // ISO8601 - Last TEMP_HUM update

  // Noise Level (V5008 only)
  noiseLevel: Array<{
    sensorIndex: number;
    noise: number | null;
  }>;
  lastSeenNs: string | null; // ISO8601 - Last NOISE_LEVEL update

  // RFID Snapshot
  rfidSnapshot: Array<{
    sensorIndex: number;
    tagId: string | null;
    isAlarm: boolean;
  }>;
  lastSeenRfid: string | null; // ISO8601 - Last RFID_SNAPSHOT update

  // Door State
  door1State: number | null; // 0=closed, 1=open
  door2State: number | null; // 0=closed, 1=open, null=single door
  lastSeenDoor: string | null; // ISO8601 - Last DOOR_STATE update
}

/**
 * Device Metadata State
 * Stores device-level configuration and module list
 *
 * Reference: SUO_UOS_DB_Spec.md Section 5.3.2
 */
export interface DeviceMetadata {
  // Identification
  deviceId: string;
  deviceType: 'V5008' | 'V6800';

  // Network Configuration
  ip: string;
  mac: string;

  // V5008 Only Fields
  fwVer?: string; // Device firmware version
  mask?: string; // Network mask
  gwIp?: string; // Gateway IP

  // Timestamps
  lastSeenInfo: string | null; // ISO8601 - Last device info update

  // Active Modules
  activeModules: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer?: string; // Module firmware version
    uTotal: number;
  }>;
}

/**
 * UOS Cache Interface
 * Provides operations for storing and retrieving unified state
 *
 * Reference: specs/architecture.md Section 10.3 (aligned with SUO spec)
 */
export interface IUOSCache {
  // Module telemetry operations
  setModule(deviceId: string, moduleIndex: number, state: ModuleTelemetry): void;
  getModule(deviceId: string, moduleIndex: number): ModuleTelemetry | null;
  getAllModules(deviceId: string): ModuleTelemetry[];

  // Device metadata operations
  setDeviceInfo(deviceId: string, info: DeviceMetadata): void;
  getDeviceInfo(deviceId: string): DeviceMetadata | null;

  // Device info merge operations
  mergeDeviceInfo(deviceId: string, info: Partial<DeviceMetadata>): DeviceMetadata;
  isDeviceInfoComplete(deviceId: string): boolean;

  // General operations
  delete(key: string): boolean;
  clear(): void;
  getStats(): CacheStats;
  getAllDeviceIds(): string[];
  getAllEntries(): Array<{ key: string; timestamp: number; ttl: number }>;
}

/**
 * Cache Statistics
 * Tracks cache performance and backpressure metrics
 */
export interface CacheStats {
  size: number; // Current number of entries
  maxSize: number; // Maximum allowed entries
  maxQueueSize: number; // Backpressure: max queued operations
  hitCount: number; // Cache hits
  missCount: number; // Cache misses
  evictionCount: number; // Number of evictions (LRU)
  queuedOperations: number; // Current queue size (backpressure)
}

/**
 * Cache Implementation Configuration
 * v1.0: Memory only (Redis is future enhancement)
 * Note: This is the runtime cache config, different from AppConfig.cache
 */
export interface CacheImplementationConfig {
  type: 'memory'; // v1.0 supports memory only
  maxSize: number; // Max entries (default: 10000)
  defaultTTL: number; // Time-to-live in seconds (default: 300)
  maxQueueSize: number; // Max queued ops before backpressure (default: 1000)
}

/**
 * Cache Entry
 * Internal representation of cached data with metadata
 */
export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number; // Unix timestamp (ms)
  ttl: number; // TTL in milliseconds
  accessCount: number; // For LRU tracking
}

/**
 * Cache Key Format
 * Format: device:{deviceId}:{type}:{identifier}
 *
 * Examples:
 * - device:2437871205:module:1  (Module telemetry)
 * - device:2437871205:info      (Device metadata)
 */
export type CacheKey = `device:${string}:module:${number}` | `device:${string}:info`;

/**
 * Helper function to generate cache keys
 */
export function generateModuleKey(deviceId: string, moduleIndex: number): string {
  return `device:${deviceId}:module:${moduleIndex}`;
}

export function generateDeviceInfoKey(deviceId: string): string {
  return `device:${deviceId}:info`;
}
