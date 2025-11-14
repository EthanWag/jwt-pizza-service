const config = require('./config.js');

class logger {
  static httpLogger = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
  
    res.send = function(resBody) {
      try {
        logger.logResponse(req, this, resBody);
      } catch (err) {
        console.error('Logging error in send:', err?.message);
      }
      res.send = originalSend;
      return originalSend.call(this, resBody);
    };
  
    res.json = function(resBody) {
      try {
        logger.logResponse(req, this, resBody);
      } catch (err) {
        console.error('Logging error in json:', err?.message);
      }
      res.json = originalJson;
      return originalJson.call(this, resBody);
    };
  
    res.end = function(resBody) {
      try {
        logger.logResponse(req, this, resBody);
      } catch (err) {
        console.error('Logging error in end:', err?.message);
      }
      res.end = originalEnd;
      return originalEnd.call(this, resBody);
    };
  
    next();
  };

  static logResponse = (req, res, resBody) => {
    const logData = {
      authorized: !!req.headers.authorization,
      path: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      reqBody: JSON.stringify(req.body),
      resBody: JSON.stringify(resBody),
    };
    const level = this.statusToLogLevel(res.statusCode);
    this.log(level, 'http', logData);
  };

  static log(level, type, logData) {
    const labels = { component: config.logs.source, level: level, type: type };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  static statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  static nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  static sanitize(logData) {
    logData = JSON.stringify(logData);
    return logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
  }

  static sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logs.url}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logs.userId}:${config.logs.apiKey}`,
      },
    }).then((res) => {
      console.log(res);
      if (!res.ok) console.log('Failed to send log to Grafana');
    });
  }
}
module.exports = logger;