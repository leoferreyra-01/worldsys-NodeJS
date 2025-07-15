#!/usr/bin/env node

const autocannon = require('autocannon');
const { spawn } = require('child_process');

// Configuration
const BASE_URL = 'http://localhost:3001';
const CONCURRENT_CONNECTIONS = 100;
const DURATION = 30; // seconds

// Test scenarios
const testScenarios = [
  {
    name: 'Users API - GET all users',
    url: `${BASE_URL}/users`,
    method: 'GET'
  },
  {
    name: 'Users API - Create user',
    url: `${BASE_URL}/users`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      age: 25
    })
  },
  {
    name: 'Products API - GET all products',
    url: `${BASE_URL}/products`,
    method: 'GET'
  },
  {
    name: 'Products API - Create product',
    url: `${BASE_URL}/products`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Product',
      price: 99.99,
      description: 'Test product description',
      category: 'Electronics',
      inStock: true
    })
  },
  {
    name: 'Orders API - GET all orders',
    url: `${BASE_URL}/orders`,
    method: 'GET'
  },
  {
    name: 'Health Check',
    url: `${BASE_URL}/health`,
    method: 'GET'
  },
  {
    name: 'Performance Monitoring',
    url: `${BASE_URL}/performance`,
    method: 'GET'
  }
];

// Run individual test
async function runTest(scenario) {
  console.log(`\n🚀 Running: ${scenario.name}`);
  console.log(`📍 URL: ${scenario.url}`);
  console.log(`🔧 Method: ${scenario.method}`);
  
  const result = await autocannon({
    url: scenario.url,
    connections: CONCURRENT_CONNECTIONS,
    duration: DURATION,
    method: scenario.method,
    headers: scenario.headers || {},
    body: scenario.body || undefined,
    setupClient: (client) => {
      client.on('response', (client, statusCode, resBytes, responseTime) => {
        if (statusCode !== 200) {
          console.log(`⚠️  Status: ${statusCode} for ${scenario.name}`);
        }
      });
    }
  });

  console.log(`\n📊 Results for ${scenario.name}:`);
  console.log(`   Average Latency: ${result.latency.average}ms`);
  console.log(`   Requests/sec: ${result.requests.average}`);
  console.log(`   Total Requests: ${result.requests.total}`);
  console.log(`   Errors: ${result.errors}`);
  console.log(`   Timeouts: ${result.timeouts}`);
  
  return result;
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Starting Performance Tests');
  console.log('============================');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    try {
      const result = await runTest(scenario);
      results.push({
        scenario: scenario.name,
        ...result
      });
    } catch (error) {
      console.error(`❌ Error running ${scenario.name}:`, error.message);
    }
  }
  
  // Summary
  console.log('\n📈 Performance Test Summary');
  console.log('==========================');
  
  results.forEach(result => {
    console.log(`\n${result.scenario}:`);
    console.log(`  Requests/sec: ${result.requests.average.toFixed(2)}`);
    console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`);
    console.log(`  Errors: ${result.errors}`);
  });
  
  // Find best and worst performers
  const sortedByRequests = [...results].sort((a, b) => b.requests.average - a.requests.average);
  const sortedByLatency = [...results].sort((a, b) => a.latency.average - b.latency.average);
  
  console.log('\n🏆 Best Performance (Requests/sec):');
  console.log(`  1. ${sortedByRequests[0].scenario}: ${sortedByRequests[0].requests.average.toFixed(2)} req/s`);
  console.log(`  2. ${sortedByRequests[1].scenario}: ${sortedByRequests[1].requests.average.toFixed(2)} req/s`);
  console.log(`  3. ${sortedByRequests[2].scenario}: ${sortedByRequests[2].requests.average.toFixed(2)} req/s`);
  
  console.log('\n⚡ Fastest Response (Latency):');
  console.log(`  1. ${sortedByLatency[0].scenario}: ${sortedByLatency[0].latency.average.toFixed(2)}ms`);
  console.log(`  2. ${sortedByLatency[1].scenario}: ${sortedByLatency[1].latency.average.toFixed(2)}ms`);
  console.log(`  3. ${sortedByLatency[2].scenario}: ${sortedByLatency[2].latency.average.toFixed(2)}ms`);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runAllTests();
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Performance Testing Script

Usage:
  node scripts/performance-test.js [options]

Options:
  --help, -h     Show this help message
  --single       Run single test (first scenario only)
  --concurrent   Number of concurrent connections (default: 100)
  --duration     Test duration in seconds (default: 30)

Examples:
  node scripts/performance-test.js --single
  node scripts/performance-test.js --concurrent 50 --duration 60
  `);
  process.exit(0);
}

if (args.includes('--single')) {
  console.log('🎯 Running single test...');
  runTest(testScenarios[0]).then(() => process.exit(0));
} else {
  main().catch(console.error);
} 