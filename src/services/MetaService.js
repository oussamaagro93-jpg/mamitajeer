const crypto = require('crypto');
const https = require('https');
const config = require('../config');
const logger = require('../utils/logger');

class MetaService {
  sendEvent(eventPayload) {
    var id = config.meta.pixelId;
    var token = config.meta.accessToken;

    if (!id || id === 'your_pixel_id' || !token || token === 'your_meta_access_token') {
      return Promise.resolve({ skipped: true, reason: 'Meta not configured' });
    }

    var payload = this.buildPayload(eventPayload);
    return this.deliver(payload);
  }

  buildPayload(eventPayload) {
    var userData = eventPayload.user_data || {};
    var metaBrowserData = eventPayload.meta_browser_data || {};
    var customData = eventPayload.custom_data || {};

    var hashedUserData = {
      em: userData.em ? [this.hash(this.normalizeEmail(userData.em))] : undefined,
      ph: userData.ph ? [this.hash(this.normalizePhone(userData.ph))] : undefined,
      fn: userData.fn ? [this.hash(this.normalizeName(userData.fn))] : undefined,
      ln: userData.ln ? [this.hash(this.normalizeName(userData.ln))] : undefined,
      ct: userData.ct ? [this.hash(this.normalizeCity(userData.ct))] : undefined,
      st: userData.st ? [this.hash(this.normalizeState(userData.st))] : undefined,
      zp: userData.zp ? [this.hash(this.normalizeZip(userData.zp))] : undefined,
      country: userData.country ? [this.hash(this.normalizeCountry(userData.country))] : undefined,
      external_id: userData.external_id ? [this.hash(userData.external_id)] : undefined,
      client_ip_address: metaBrowserData.client_ip_address || undefined,
      client_user_agent: metaBrowserData.client_user_agent || undefined,
      fbp: metaBrowserData.fbp || undefined,
      fbc: metaBrowserData.fbc || undefined,
    };

    Object.keys(hashedUserData).forEach(function (k) {
      if (hashedUserData[k] === undefined) delete hashedUserData[k];
    });

    var data = {
      event_name: eventPayload.event_name,
      event_time: eventPayload.event_time || Math.floor(Date.now() / 1000),
      event_id: eventPayload.event_id || undefined,
      action_source: 'website',
      user_data: hashedUserData,
      custom_data: customData,
    };

    if (config.meta.testEventCode) {
      data.test_event_code = config.meta.testEventCode;
    }

    return {
      data: [data],
      access_token: config.meta.accessToken,
    };
  }

  deliver(payload) {
    return new Promise(function (resolve, reject) {
      var body = JSON.stringify(payload);
      var url = new URL(
        config.meta.graphApiBase + '/v' + config.meta.graphApiVersion +
        '/' + config.meta.pixelId + '/events'
      );

      var options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      };

      var req = https.request(options, function (res) {
        var responseBody = '';
        res.on('data', function (chunk) { responseBody += chunk; });
        res.on('end', function () {
          var result;
          try { result = JSON.parse(responseBody); } catch (e) {
            result = { raw: responseBody };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            logger.error('Meta CAPI error: ' + JSON.stringify(result));
            resolve(result);
          }
        });
      });

      req.on('error', function (err) {
        logger.error('Meta CAPI request failed: ' + err.message);
        resolve({ error: err.message });
      });

      req.on('timeout', function () {
        req.destroy();
        resolve({ error: 'timeout' });
      });

      req.write(body);
      req.end();
    });
  }

  hash(value) {
    if (!value) return value;
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  normalizeEmail(email) {
    if (!email) return '';
    return String(email).toLowerCase().trim();
  }

  normalizePhone(phone) {
    if (!phone) return '';
    var digits = String(phone).replace(/\D/g, '');
    if (digits.length === 9) {
      digits = '213' + digits;
    } else if (digits.length === 10 && digits.startsWith('0')) {
      digits = '213' + digits.substring(1);
    }
    return digits;
  }

  normalizeName(name) {
    if (!name) return '';
    return String(name).toLowerCase().trim();
  }

  normalizeCity(city) {
    if (!city) return '';
    return String(city).toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
  }

  normalizeState(state) {
    if (!state) return '';
    return String(state).toLowerCase().trim();
  }

  normalizeZip(zip) {
    if (!zip) return '';
    return String(zip).trim().replace(/\s/g, '');
  }

  normalizeCountry(country) {
    if (!country) return '';
    return String(country).toLowerCase().trim();
  }
}

module.exports = new MetaService();
