/**
 * UOS Cache Implementation
 *
 * In-memory cache with LRU eviction and TTL support
 * Based on SUO_UOS_DB_Spec.md Section 5
 */

import {
  IUOSCache,
  ModuleTelemetry,
  DeviceMetadata,
  CacheStats,
  CacheImplementationConfig,
  generateModuleKey,
  generateDeviceInfoKey,
} from '../../types/uos.types';
import { Logger } from '../../utils/logger';

/**
 * LRU Cache Node
 * Doubly-linked list node for O(1) LRU operations
 */
interface LRUCacheNode {
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
  prev: LRUCacheNode | null;
  next: LRUCacheNode | null;
}

/**
 * UOS Cache
 * Implements IUOSCache with LRU eviction and TTL support
 */
export class UOSCache implements IUOSCache {
  private cache: Map<string, LRUCacheNode>;
  private head: LRUCacheNode | null = null;
  private tail: LRUCacheNode | null = null;
  private config: CacheImplementationConfig;
  private logger: Logger;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheImplementationConfig>) {
    this.config = {
      type: 'memory',
      maxSize: 10000,
      defaultTTL: 86400, // 24 hours - active devices should not lose cache
      maxQueueSize: 1000,
      ...config,
    };

    this.cache = new Map();
    this.logger = new Logger('UOSCache');
    this.stats = {
      size: 0,
      maxSize: this.config.maxSize,
      maxQueueSize: this.config.maxQueueSize,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      queuedOperations: 0,
    };

    // Start cleanup interval for expired entries
    this.startCleanupInterval();

    this.logger.info('UOS Cache initialized', {
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL,
    });
  }

  /**
   * Store or update module telemetry
   */
  setModule(deviceId: string, moduleIndex: number, state: ModuleTelemetry): void {
    const key = generateModuleKey(deviceId, moduleIndex);
    this.set(key, state, this.config.defaultTTL * 1000);
    this.logger.debug(`Module telemetry cached: ${key}`);
  }

  /**
   * Retrieve module telemetry
   */
  getModule(deviceId: string, moduleIndex: number): ModuleTelemetry | null {
    const key = generateModuleKey(deviceId, moduleIndex);
    const entry = this.get(key);
    return entry as ModuleTelemetry | null;
  }

  /**
   * Retrieve all module telemetry for a device
   */
  getAllModules(deviceId: string): ModuleTelemetry[] {
    const modules: ModuleTelemetry[] = [];
    const prefix = `device:${deviceId}:module:`;

    for (const [key, node] of this.cache.entries()) {
      if (key.startsWith(prefix) && !this.isExpired(node)) {
        this.moveToHead(node);
        modules.push(node.data as ModuleTelemetry);
      }
    }

    return modules;
  }

  /**
   * Store or update device metadata
   */
  setDeviceInfo(deviceId: string, info: DeviceMetadata): void {
    const key = generateDeviceInfoKey(deviceId);
    this.set(key, info, this.config.defaultTTL * 1000);
    this.logger.debug(`Device info cached: ${key}`);
  }

  /**
   * Retrieve device metadata
   */
  getDeviceInfo(deviceId: string): DeviceMetadata | null {
    const key = generateDeviceInfoKey(deviceId);
    const entry = this.get(key);
    return entry as DeviceMetadata | null;
  }

  /**
   * Merge partial device info updates with existing data
   * New non-null values override existing values
   * Returns the complete merged device metadata
   */
  mergeDeviceInfo(deviceId: string, info: Partial<DeviceMetadata>): DeviceMetadata {
    const existing = this.getDeviceInfo(deviceId);

    // Create base metadata with deviceId
    // Build the base object conditionally to avoid unsafe type assertions
    const baseInfo: Partial<DeviceMetadata> = existing ?? {
      deviceId,
      ip: '',
      mac: '',
      lastSeenInfo: new Date().toISOString(),
      activeModules: [],
    };

    // Include deviceType in base only if provided in the incoming info
    if (info.deviceType !== undefined) {
      baseInfo.deviceType = info.deviceType;
    }

    // Build complete merged object from baseInfo
    // deviceType may be undefined until explicitly set via merge logic below
    const merged: DeviceMetadata = {
      deviceId: baseInfo.deviceId!,
      deviceType: baseInfo.deviceType,
      ip: baseInfo.ip ?? '',
      mac: baseInfo.mac ?? '',
      lastSeenInfo: baseInfo.lastSeenInfo ?? new Date().toISOString(),
      activeModules: baseInfo.activeModules ?? [],
      // Preserve optional fields from existing data
      fwVer: baseInfo.fwVer,
      mask: baseInfo.mask,
      gwIp: baseInfo.gwIp,
    } as DeviceMetadata;

    // Merge scalar fields - new non-null values override existing
    if (info.deviceType !== undefined) merged.deviceType = info.deviceType;
    if (info.ip !== undefined) merged.ip = info.ip;
    if (info.mac !== undefined) merged.mac = info.mac;
    if (info.fwVer !== undefined) merged.fwVer = info.fwVer;
    if (info.mask !== undefined) merged.mask = info.mask;
    if (info.gwIp !== undefined) merged.gwIp = info.gwIp;

    // Always update timestamp
    merged.lastSeenInfo = new Date().toISOString();

    // Merge active modules by moduleIndex
    if (info.activeModules !== undefined && info.activeModules.length > 0) {
      merged.activeModules = this.mergeActiveModules(merged.activeModules, info.activeModules);
    }

    // Store merged result
    this.setDeviceInfo(deviceId, merged);

    return merged;
  }

  /**
   * Check if device info has all required fields present
   * Required fields: ip, mac, deviceType, activeModules (non-empty)
   * For V5008: also requires fwVer, mask, gwIp
   */
  isDeviceInfoComplete(deviceId: string): boolean {
    const info = this.getDeviceInfo(deviceId);

    if (!info) {
      return false;
    }

    // Check base required fields
    if (!info.deviceType || !info.ip || !info.mac) {
      return false;
    }

    // Check for non-empty activeModules
    if (!info.activeModules || info.activeModules.length === 0) {
      return false;
    }

    // For V5008, check additional required fields
    if (info.deviceType === 'V5008') {
      if (!info.fwVer || !info.mask || !info.gwIp) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge active module arrays by moduleIndex
   * New modules override existing ones with the same index
   */
  private mergeActiveModules(
    existing: DeviceMetadata['activeModules'],
    updates: DeviceMetadata['activeModules']
  ): DeviceMetadata['activeModules'] {
    // Create a map of existing modules by index
    const moduleMap = new Map(existing.map(m => [m.moduleIndex, { ...m }]));

    // Apply updates - override or add new modules
    for (const update of updates) {
      moduleMap.set(update.moduleIndex, { ...update });
    }

    // Convert map back to array, sorted by moduleIndex
    return Array.from(moduleMap.values()).sort((a, b) => a.moduleIndex - b.moduleIndex);
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.stats.size--;

    this.logger.debug(`Cache entry deleted: ${key}`);
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.stats.size = 0;
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.stats.evictionCount = 0;

    this.logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all device IDs in the cache
   * Extracts unique device IDs from cache keys
   */
  getAllDeviceIds(): string[] {
    const deviceIds = new Set<string>();

    for (const key of this.cache.keys()) {
      // Parse key format: device:{deviceId}:module:{index} or device:{deviceId}:info
      const match = key.match(/^device:([^:]+):/);
      if (match) {
        deviceIds.add(match[1]);
      }
    }

    return Array.from(deviceIds);
  }

  /**
   * Get all entries in the cache (for debugging/admin)
   */
  getAllEntries(): Array<{ key: string; timestamp: number; ttl: number }> {
    const entries: Array<{ key: string; timestamp: number; ttl: number }> = [];

    for (const [key, node] of this.cache.entries()) {
      if (!this.isExpired(node)) {
        entries.push({
          key,
          timestamp: node.timestamp,
          ttl: node.ttl,
        });
      }
    }

    return entries;
  }

  /**
   * Dispose of the cache (stop cleanup interval)
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    this.logger.info('UOS Cache disposed');
  }

  /**
   * Internal set operation with TTL
   */
  private set(key: string, data: unknown, ttlMs: number): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing entry
      existingNode.data = data;
      existingNode.timestamp = Date.now();
      existingNode.ttl = ttlMs;
      this.moveToHead(existingNode);
    } else {
      // Check if we need to evict (LRU)
      if (this.stats.size >= this.config.maxSize) {
        this.evictLRU();
      }

      // Create new entry
      const newNode: LRUCacheNode = {
        key,
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
        prev: null,
        next: null,
      };

      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.stats.size++;
    }
  }

  /**
   * Internal get operation with LRU update
   */
  private get(key: string): unknown | null {
    const node = this.cache.get(key);

    if (!node) {
      this.stats.missCount++;
      return null;
    }

    if (this.isExpired(node)) {
      this.delete(key);
      this.stats.missCount++;
      return null;
    }

    // Update LRU order
    this.moveToHead(node);
    this.stats.hitCount++;

    return node.data;
  }

  /**
   * Check if a node is expired
   */
  private isExpired(node: LRUCacheNode): boolean {
    return Date.now() - node.timestamp > node.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const keyToEvict = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(keyToEvict);
    this.stats.size--;
    this.stats.evictionCount++;

    this.logger.debug(`LRU eviction: ${keyToEvict}`);
  }

  /**
   * Add node to head of LRU list
   */
  private addToHead(node: LRUCacheNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove node from LRU list
   */
  private removeNode(node: LRUCacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Move node to head (mark as recently used)
   */
  private moveToHead(node: LRUCacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Clean up every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired entries`);
    }
  }
}

// Export singleton instance
export const uosCache = new UOSCache();
