/**
 * Error detectors - each handles ONE specific type of error (SRP)
 */

export { BaseErrorDetector } from './base-detector.js';
export { DnsDirectConnectionDetector } from './dns-direct-connection-detector.js';
export { DnsGenericDetector } from './dns-generic-detector.js';
export { ConnectionRefusedDetector } from './connection-refused-detector.js';
export { ConnectionTimeoutDetector } from './connection-timeout-detector.js';
export { AuthenticationDetector } from './authentication-detector.js';
export { SslDetector } from './ssl-detector.js';
export { PreparedStatementDetector } from './prepared-statement-detector.js';
export { DatabaseNotFoundDetector } from './database-not-found-detector.js';
export { TooManyConnectionsDetector } from './too-many-connections-detector.js';
export { InvalidUrlDetector } from './invalid-url-detector.js';
