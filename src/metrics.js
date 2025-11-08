const os = require('os');
const config = require('./config');

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

  // TODO:metrics I need to keep track of
  // HTTP request count x
  // Active users
  // Authentication attempts/minuite x
    // wheather they failed or succeeded x
  // pizzas
    // Sold/minute x
    // Create failures x
    // Revenue/minute x
  // Latency of requests
    // Service endpoint x
    // Pizza creation x

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

          const endpoint = req.path;
          const statusCode = res.statusCode;

          // track active users
          switch (endpoint) {
            case '/api/auth':
              if (req.method === 'POST' && statusCode === 200) {
                // Register
                authSuccessAttempts += 1;
                activeUsers += 1;
              } else if (req.method === 'PUT' && statusCode === 200) {
                // Login
                authSuccessAttempts += 1;
                activeUsers += 1;
              } else if (req.method === 'DELETE' && statusCode === 200) {
                // Logout
                activeUsers = Math.max(0, activeUsers - 1);
              } else if (req.method === 'POST' || req.method === 'PUT') {
                // Failed register or login
                authFailedAttempts += 1;
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
        this.sendMetricToGrafana('http_request_count_per_min', totalRequests, 'sum', '1');
        this.sendMetricToGrafana('http_get_request_count_per_min', getRequests, 'sum', '1');
        this.sendMetricToGrafana('http_post_request_count_per_min', postRequests, 'sum', '1');
        this.sendMetricToGrafana('http_put_request_count_per_min', putRequests, 'sum', '1');
        this.sendMetricToGrafana('http_delete_request_count_per_min', deleteRequests, 'sum', '1');

        // active users
        this.sendMetricToGrafana('active_users', activeUsers, 'gauge', '1');
        this.sendMetricToGrafana('average_request_latency_ms', totalRequests > 0 ? (latency / totalRequests).toFixed(2) : 0, 'gauge', 'ms');

        // authentication
        this.sendMetricToGrafana('auth_total_attempts_per_min', (authSuccessAttempts + authFailedAttempts), 'sum', '1');
        this.sendMetricToGrafana('auth_success_attempts_per_min', authSuccessAttempts, 'sum', '1');
        this.sendMetricToGrafana('auth_failed_attempts_per_min', authFailedAttempts, 'sum', '1');

        // core metrics
        this.sendMetricToGrafana('cpu_usage_percentage', this.getCpuUsagePercentage(), 'gauge', 'percent');
        this.sendMetricToGrafana('memory_usage_percentage', this.getMemoryUsagePercentage(), 'gauge', 'percent');
        
        // pizza metrics
        this.sendMetricToGrafana('pizza_revenue_per_min', revenue, 'sum', 'USD');
        this.sendMetricToGrafana('total_pizza_revenue', totalRevenue, 'sum', 'USD');
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

      // authentication metrics
      authSuccessAttempts = 0;
      authFailedAttempts = 0;

      // pizza metrics
      pizzasSold = 0;
      revenue = 0;
    }

    static getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
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
            scopeMetrics: [
              {
                metrics: [
                  {
                    name: metricName,
                    unit: unit,
                    [type]: {
                      dataPoints: [
                        {
                          asInt: metricValue,
                          timeUnixNano: Date.now() * 1000000,
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
        metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
      }
    
      const body = JSON.stringify(metric);
      fetch(`${config.url}`, {
        method: 'POST',
        body: body,
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      })
        .then((response) => {
          if (!response.ok) {
            response.text().then((text) => {
              console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
            });
          } else {
            console.log(`Pushed ${metricName}`);
          }
        })
        .catch((error) => {
          console.error('Error pushing metrics:', error);
        });
    }
}

module.exports = metrics;