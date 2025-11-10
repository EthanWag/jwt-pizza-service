const os = require('os');
const config = require('./config.js');

// general stats
let totalRequests = 0;
let getRequests = 0;
let postRequests = 0;
let putRequests = 0;
let deleteRequests = 0;


let factoryLatency = 0;
let latency = 0;
let activeUsers = 0;

// Authentication metrics
let authSuccessAttempts = 0;
let authFailedAttempts = 0;

// Pizza metrics
let pizzasSold = 0;
let failedPizzaCreations = 0;
let revenue = 0;
let totalRevenue = 0;

class metrics {

    static requestTracker(req, res, next) {

        const start = Date.now();

        switch (req.method) {
          case 'GET':
            getRequests += 1;
            break;
          case 'POST':
            postRequests += 1;
            break;
          case 'PUT':
            putRequests += 1;
            break;
          case 'DELETE':
            deleteRequests += 1;
            break;
          default:
            break;
        }
        totalRequests += 1;

    
        res.on('finish', () => {
          const duration = Date.now() - start;
          latency += duration;

          const endpoint = req.originalUrl.split('?')[0];
          const ok = res.statusCode >= 200 && res.statusCode < 300;

          // track active users
          switch (endpoint) {
            case '/api/auth':
              if (req.method === 'POST' && ok) {
                // Register
                authSuccessAttempts += 1;
                activeUsers += 1;
              } else if (req.method === 'PUT' && ok) {
                // Login
                authSuccessAttempts += 1;
                activeUsers += 1;
              } else if (req.method === 'DELETE' && ok) {
                // Logout
                activeUsers = Math.max(0, activeUsers - 1);
              } else if ((req.method === 'POST' || req.method === 'PUT') && !ok) {
                // Failed register or login
                authFailedAttempts += 1;
              }
              break;
            case '/api/order':
              if (req.method === 'POST') {
                if (ok) {
                  pizzasSold += req.body.items.length;
                  revenue += req.body.items.reduce((sum, item) => sum + item.price, 0);
                  totalRevenue += revenue;

                } else {
                  // Failed pizza creation
                  failedPizzaCreations += 1;
                }
              }
              break;
            default:
              break;
          }
        });
        next();
    }

    static sendIntervalMetrics = () => {
      try {
        
        // list of metrics I'm going to send
        // request metrics
        console.log('Sending metrics to Grafana...');
        console.log('-----------------------------------');
        console.log('Total Requests:', totalRequests);

        this.sendMetricToGrafana('http_request_count_per_min', totalRequests, 'sum', '1');
        this.sendMetricToGrafana('http_get_request_count_per_min', getRequests, 'sum', '1');
        this.sendMetricToGrafana('http_post_request_count_per_min', postRequests, 'sum', '1');
        this.sendMetricToGrafana('http_put_request_count_per_min', putRequests, 'sum', '1');
        this.sendMetricToGrafana('http_delete_request_count_per_min', deleteRequests, 'sum', '1');

        // active users
        this.sendMetricToGrafana('active_users', activeUsers, 'gauge', '1');
        this.sendMetricToGrafana('average_request_latency_ms', totalRequests > 0 ? (latency / totalRequests).toFixed(2) : 0, 'gauge', 'ms');
        this.sendMetricToGrafana('average_factory_latency_ms', totalRequests > 0 ? (factoryLatency / totalRequests).toFixed(2) : 0, 'gauge', 'ms');

        // authentication
        this.sendMetricToGrafana('auth_total_attempts_per_min', (authSuccessAttempts + authFailedAttempts), 'sum', '1');
        this.sendMetricToGrafana('auth_success_attempts_per_min', authSuccessAttempts, 'sum', '1');
        this.sendMetricToGrafana('auth_failed_attempts_per_min', authFailedAttempts, 'sum', '1');

        // core metrics
        this.sendMetricToGrafana('cpu_usage_percentage', this.getCpuUsagePercentage(), 'gauge', 'percent');
        this.sendMetricToGrafana('memory_usage_percentage', this.getMemoryUsagePercentage(), 'gauge', 'percent');
        
        // pizza metrics
        this.sendMetricToGrafana('pizza_revenue_per_min', revenue, 'sum', 'BTC');
        this.sendMetricToGrafana('total_pizza_revenue', totalRevenue, 'sum', 'BTC');
        this.sendMetricToGrafana('failed_pizza_creations_per_min', failedPizzaCreations, 'sum', '1');
        this.sendMetricToGrafana('sold_pizzas_per_min', pizzasSold, 'sum', '1');
        

        // reset all of our variable
        this.reset();
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    };

    static reset() {
      // request metrics
      totalRequests = 0;
      getRequests = 0;
      postRequests = 0;
      putRequests = 0;
      deleteRequests = 0;

      // latency
      latency = 0;
      factoryLatency = 0;

      // authentication metrics
      authSuccessAttempts = 0;
      authFailedAttempts = 0;

      // pizza metrics
      pizzasSold = 0;
      revenue = 0;
    }

    static getCpuUsagePercentage() {
      const cpus = os.cpus();
      const loadAvg = os.loadavg()[0]; // 1-minute load average
      const cpuUsage = (loadAvg / cpus.length) * 100; // Normalize by number of CPUs
      return cpuUsage.toFixed(2); // Return as a percentage with 2 decimal places
    }
    
    static getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
    }
    
    static sendMetricToGrafana(metricName, metricValue, type, unit) {
      const metric = {
        resourceMetrics: [
          {
            resource: {
              attributes: [
                {
                  key: 'service.name',
                  value: { stringValue: config.metrics.source || 'unknown-service' },
                },
              ],
            },
            scopeMetrics: [
              {
                scope: { name: 'metrics-collector' },
                metrics: [
                  {
                    name: metricName,
                    unit: unit,
                    [type]: {
                      dataPoints: [
                        {
                          attributes: [],
                          asDouble: parseFloat(metricValue),
                          timeUnixNano: Date.now() * 1e6,
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
    
      if (type === 'sum') {
        metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality =
          'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
      }
    
      const body = JSON.stringify(metric);
      fetch(config.metrics.url, {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${config.metrics.apiKey}`,
          'Content-Type': 'application/json',
        },
      })
        .then(async (response) => {
          const text = await response.text();
          if (!response.ok) {
            console.error(`❌ Failed to push ${metricName}: ${response.status} ${text}`);
          } else {
            console.log(`✅ Sent ${metricName}`);
          }
        })
        .catch((err) => console.error(`Error pushing ${metricName}:`, err));
    }
}

module.exports = metrics;