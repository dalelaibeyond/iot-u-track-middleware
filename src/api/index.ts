/**
 * REST API Module
 *
 * HTTP API for the MQTT Middleware
 * Exposes device state, history, and command endpoints
 */

export { APIServer, APIServerConfig } from './server';
export * from './middleware/error-handler';
