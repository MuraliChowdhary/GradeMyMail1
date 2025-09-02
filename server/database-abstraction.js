// Simple database abstraction layer
// Provides a unified interface for different storage backends

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.adapter = null;
    this.connected = false;
  }

  async connect() {
    // For now, just use memory storage
    this.adapter = new MemoryAdapter(this.config);
    this.connected = true;
    console.log('💾 Database manager connected (memory adapter)');
  }

  async disconnect() {
    if (this.adapter && this.adapter.disconnect) {
      await this.adapter.disconnect();
    }
    this.connected = false;
    console.log('💾 Database manager disconnected');
  }

  async set(key, value, ttl) {
    if (!this.connected) throw new Error('Database not connected');
    return this.adapter.set(key, value, ttl);
  }

  async get(key) {
    if (!this.connected) throw new Error('Database not connected');
    return this.adapter.get(key);
  }

  async delete(key) {
    if (!this.connected) throw new Error('Database not connected');
    return this.adapter.delete(key);
  }

  async getStats() {
    if (!this.connected) throw new Error('Database not connected');
    return this.adapter.getStats ? this.adapter.getStats() : {};
  }

  async healthCheck() {
    if (!this.connected) return false;
    return this.adapter.healthCheck ? this.adapter.healthCheck() : true;
  }

  getAdapterType() {
    return this.config.type || 'memory';
  }

  async switchAdapter(newConfig) {
    // For now, just log the switch attempt
    console.log(`🔄 Database adapter switch requested: ${this.config.type} -> ${newConfig.type}`);
    this.config = newConfig;
  }
}

class MemoryAdapter {
  constructor(config) {
    this.config = config;
    this.storage = new Map();
    this.stats = { reads: 0, writes: 0, deletes: 0 };
  }

  async set(key, value, ttl) {
    const expires = ttl ? Date.now() + ttl : null;
    this.storage.set(key, { value, expires });
    this.stats.writes++;
    return true;
  }

  async get(key) {
    const entry = this.storage.get(key);
    if (!entry) {
      this.stats.reads++;
      return null;
    }

    if (entry.expires && Date.now() > entry.expires) {
      this.storage.delete(key);
      this.stats.reads++;
      return null;
    }

    this.stats.reads++;
    return entry.value;
  }

  async delete(key) {
    const existed = this.storage.has(key);
    this.storage.delete(key);
    this.stats.deletes++;
    return existed;
  }

  getStats() {
    return {
      ...this.stats,
      size: this.storage.size,
    };
  }

  healthCheck() {
    return true;
  }
}

function createDatabaseManager(config) {
  return new DatabaseManager(config);
}

export { createDatabaseManager, DatabaseManager };