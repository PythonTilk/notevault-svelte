#!/usr/bin/env node

/**
 * NoteVault Load Testing Suite
 * Tests API endpoints under concurrent load to verify performance
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

class LoadTester {
  constructor(baseUrl = 'http://localhost:56770') {
    this.baseUrl = baseUrl;
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      responseTimes: []
    };
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && method !== 'GET') {
        const body = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const startTime = Date.now();
      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          this.results.responseTimes.push(responseTime);
          
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({
              statusCode: res.statusCode,
              data: jsonData,
              responseTime,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: responseData,
              responseTime,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          }
        });
      });

      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        reject({ error, responseTime });
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async login(email = 'admin@notevault.com', password = 'admin123') {
    try {
      const response = await this.makeRequest('POST', '/api/auth/login', {
        email, password
      });
      
      if (response.success && response.data.token) {
        return response.data.token;
      } else {
        throw new Error('Login failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      throw new Error('Login request failed: ' + error.message);
    }
  }

  async runConcurrentRequests(requestFunction, concurrency = 10, totalRequests = 100) {
    console.log(`Running ${totalRequests} requests with ${concurrency} concurrent connections...`);
    
    const batches = [];
    for (let i = 0; i < totalRequests; i += concurrency) {
      const batchSize = Math.min(concurrency, totalRequests - i);
      const batch = Array(batchSize).fill().map(() => requestFunction());
      batches.push(batch);
    }

    const startTime = Date.now();
    
    for (const batch of batches) {
      try {
        const results = await Promise.allSettled(batch);
        results.forEach(result => {
          this.results.total++;
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              this.results.successful++;
            } else {
              this.results.failed++;
              this.results.errors.push(`HTTP ${result.value.statusCode}: ${JSON.stringify(result.value.data)}`);
            }
          } else {
            this.results.failed++;
            this.results.errors.push(result.reason.message || result.reason);
          }
        });
      } catch (error) {
        console.error('Batch error:', error);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    return {
      totalTime,
      requestsPerSecond: (this.results.total / totalTime) * 1000,
      ...this.results
    };
  }

  calculateStats(responseTimes) {
    if (responseTimes.length === 0) return {};
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  async testHealthCheck() {
    console.log('\n=== Testing Health Check Endpoint ===');
    
    const testRequest = async () => {
      return await this.makeRequest('GET', '/health');
    };

    const results = await this.runConcurrentRequests(testRequest, 20, 100);
    const stats = this.calculateStats(results.responseTimes);
    
    console.log(`Success Rate: ${((results.successful / results.total) * 100).toFixed(2)}%`);
    console.log(`Response Times (ms): Min=${stats.min}, Avg=${stats.avg?.toFixed(2)}, Max=${stats.max}, P95=${stats.p95}`);
    console.log(`RPS: ${results.requestsPerSecond.toFixed(2)}`);
    
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.slice(0, 5));
    }
    
    return results;
  }

  async testAuthentication() {
    console.log('\n=== Testing Authentication Endpoint ===');
    
    this.results = { total: 0, successful: 0, failed: 0, errors: [], responseTimes: [] };
    
    const testRequest = async () => {
      return await this.makeRequest('POST', '/api/auth/login', {
        email: 'admin@notevault.com',
        password: 'admin123'
      });
    };

    const results = await this.runConcurrentRequests(testRequest, 10, 50);
    const stats = this.calculateStats(results.responseTimes);
    
    console.log(`Success Rate: ${((results.successful / results.total) * 100).toFixed(2)}%`);
    console.log(`Response Times (ms): Min=${stats.min}, Avg=${stats.avg?.toFixed(2)}, Max=${stats.max}, P95=${stats.p95}`);
    console.log(`RPS: ${results.requestsPerSecond.toFixed(2)}`);
    
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.slice(0, 5));
    }
    
    return results;
  }

  async testWorkspaceOperations() {
    console.log('\n=== Testing Workspace Operations ===');
    
    // Get auth token first
    let token;
    try {
      token = await this.login();
    } catch (error) {
      console.error('Failed to get auth token:', error.message);
      return;
    }

    this.results = { total: 0, successful: 0, failed: 0, errors: [], responseTimes: [] };
    
    const testRequest = async () => {
      return await this.makeRequest('GET', '/api/workspaces', null, {
        'Authorization': `Bearer ${token}`
      });
    };

    const results = await this.runConcurrentRequests(testRequest, 15, 75);
    const stats = this.calculateStats(results.responseTimes);
    
    console.log(`Success Rate: ${((results.successful / results.total) * 100).toFixed(2)}%`);
    console.log(`Response Times (ms): Min=${stats.min}, Avg=${stats.avg?.toFixed(2)}, Max=${stats.max}, P95=${stats.p95}`);
    console.log(`RPS: ${results.requestsPerSecond.toFixed(2)}`);
    
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.slice(0, 5));
    }
    
    return results;
  }

  async testCreateWorkspace() {
    console.log('\n=== Testing Workspace Creation Under Load ===');
    
    let token;
    try {
      token = await this.login();
    } catch (error) {
      console.error('Failed to get auth token:', error.message);
      return;
    }

    this.results = { total: 0, successful: 0, failed: 0, errors: [], responseTimes: [] };
    
    const testRequest = async () => {
      const workspaceName = `LoadTest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return await this.makeRequest('POST', '/api/workspaces', {
        name: workspaceName,
        description: 'Load test workspace',
        color: '#3B82F6',
        isPublic: false
      }, {
        'Authorization': `Bearer ${token}`
      });
    };

    const results = await this.runConcurrentRequests(testRequest, 5, 25);
    const stats = this.calculateStats(results.responseTimes);
    
    console.log(`Success Rate: ${((results.successful / results.total) * 100).toFixed(2)}%`);
    console.log(`Response Times (ms): Min=${stats.min}, Avg=${stats.avg?.toFixed(2)}, Max=${stats.max}, P95=${stats.p95}`);
    console.log(`RPS: ${results.requestsPerSecond.toFixed(2)}`);
    
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.slice(0, 5));
    }
    
    return results;
  }

  async runFullSuite() {
    console.log('🚀 NoteVault Load Testing Suite');
    console.log('================================');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Started: ${new Date().toISOString()}`);

    const suiteStart = Date.now();
    
    try {
      await this.testHealthCheck();
      await this.testAuthentication();
      await this.testWorkspaceOperations();
      await this.testCreateWorkspace();
    } catch (error) {
      console.error('Test suite error:', error);
    }

    const suiteEnd = Date.now();
    const totalDuration = (suiteEnd - suiteStart) / 1000;
    
    console.log('\n=== Load Test Summary ===');
    console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('\nRecommendations:');
    console.log('- P95 response times should be < 500ms for good UX');
    console.log('- Success rate should be > 99.5% for production');
    console.log('- RPS should handle expected peak traffic');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrl = process.argv[2] || 'http://localhost:56770';
  const tester = new LoadTester(baseUrl);
  
  tester.runFullSuite().catch(console.error);
}

export default LoadTester;