const suncalc = require('suncalc');
const request = require('request');

class SunAzimuthAccessory {
  constructor(log, config, platformConfig) {
    this.accessory = null;
    this.registered = null;
    this.config = config;
    this.platformConfig = platformConfig;
    this.log = log;

    this.cachedWeatherObj = undefined;
    this.lastupdate = 0;
    if (this.platformConfig.apikey) {
      this.getWeather();
      setInterval(() => { this.getWeather(); }, this.platformConfig.weatherUpdateIntervalSeconds * 1000);
    }
  }

  getAccessory() {
    return this.accessory;
  }

  setAccessory(accessory) {
    this.accessory = accessory;
    this.setAccessoryEventHandlers();
  }

  hasRegistered() {
    return this.registered;
  }

  initializeAccessory() {
    const { config } = this;
    const { lowerThreshold, upperThreshold } = config;
    const uuid = UUIDGen.generate(config.name);
    const accessory = new Accessory(config.name, uuid);
    // Add Device Information
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, 'mfkrause, Krillle & awaescher')
      .setCharacteristic(Characteristic.Model, 'Azimuth ' + lowerThreshold + '-' + upperThreshold)
      .setCharacteristic(Characteristic.SerialNumber, '---');

    const SensorService = accessory.addService(Service.ContactSensor, config.name);

    if (SensorService) {
      SensorService.getCharacteristic(Characteristic.ContactSensorState);
    }

    this.setAccessory(accessory);

    return accessory;
  }

  setRegistered(status) {
    this.registered = status;
  }

  setAccessoryEventHandlers() {
    const { log } = this;

    this.getAccessory().on('identify', (paired, callback) => {
      log(this.getAccessory().displayName, `Identify sensor, paired: ${paired}`);
      callback();
    });

    const SensorService = this.getAccessory().getService(Service.ContactSensor);

    if (SensorService) {
      SensorService
        .getCharacteristic(Characteristic.ContactSensorState)
        .on('get', this.getState.bind(this));

      SensorService.setCharacteristic(Characteristic.ContactSensorState, this.updateState());
      setInterval(() => {
        SensorService.setCharacteristic(Characteristic.ContactSensorState, this.updateState());
      }, 10007);
    }
  }

  updateState() {
    const { config, platformConfig, log } = this;
    const { lat, long, apikey, enableWeatherIntegration, highestAcceptableOvercast } = platformConfig;
    const { lowerThreshold, upperThreshold, lowerAltitudeThreshold, upperAltitudeThreshold } = config;
    const azimuthThresholds = [lowerThreshold, upperThreshold];

    if (!lat || !long || typeof lat !== 'number' || typeof long !== 'number') {
      log('Error: Lat/Long incorrect. Please refer to the README.');
      return 0;
    }

    const sunPos = suncalc.getPosition(Date.now(), lat, long);
    let sunPosDegrees = Math.abs((sunPos.azimuth * 180) / Math.PI + 180);
    let sunPosAltitude = Math.abs(sunPos.altitude * 90);

    if (platformConfig.debugLog) log(`Current azimuth: ${sunPosDegrees}°, altitude: ${sunPosAltitude}°`);

    if (azimuthThresholds[0] > azimuthThresholds[1]) {
      const tempThreshold = azimuthThresholds[1];
      azimuthThresholds[1] = azimuthThresholds[0];
      azimuthThresholds[0] = tempThreshold;
    }

    const isWithinThreshold = (position) => position >= azimuthThresholds[0] && position <= azimuthThresholds[1] && sunPosAltitude >= lowerAltitudeThreshold && sunPosAltitude <= upperAltitudeThreshold;

    let newState = isWithinThreshold(sunPosDegrees);
    
    if (azimuthThresholds[0] < 0 && !newState) {
      sunPosDegrees = -(360 - sunPosDegrees);
      newState = isWithinThreshold(sunPosDegrees);
    }
    
    if (azimuthThresholds[1] > 360 && !newState) {
      sunPosDegrees = 360 + sunPosDegrees;
      newState = isWithinThreshold(sunPosDegrees, azimuthThresholds);
    }

    // Sun is in relevant azimuth and altitude range, lets check daylight and clouds
    if (newState && apikey) {
      let overcast = this.returnOvercastFromCache();
      
      if (platformConfig.debugLog)
        log(`Overcast (cloud state): ${overcast}%`);

      if (enableWeatherIntegration)
        newState = overcast <= highestAcceptableOvercast;
    }

    return newState;
  }

  getState(callback) {
    const { platformConfig, log } = this;
    const newState = this.updateState();

    callback(null, newState);
    if (platformConfig.debugLog) log(this.getAccessory().displayName, `getState: ${newState}`);
  }


  // - - - - - - - - Open Weather functions - - - - - - - -
  getWeather() {
    const { platformConfig, log } = this;
    const { lat, long, apikey, weatherUpdateIntervalSeconds } = platformConfig;

    if (!this.cachedWeatherObj || (this.lastupdate + weatherUpdateIntervalSeconds) < (new Date().getTime() / 1000 | 0)) {
      let p = new Promise((resolve, reject) => {
        var url = 'http://api.openweathermap.org/data/2.5/weather?appid=' + apikey + '&lat=' + lat + '&lon=' + long;
        if (platformConfig.debugLog) log("Checking weather: %s", url);
        request(url, function (error, response, responseBody) {
          if (error) {
              log("HTTP get weather function failed: %s", error.message);
              reject(error);
          } else {
              try {
                  if (platformConfig.debugLog) log("Server response:", responseBody);
                  this.cachedWeatherObj = JSON.parse(responseBody);
                  this.lastupdate = (new Date().getTime() / 1000);
                  log(`Overcast (cloud state): ${this.returnOvercastFromCache()}%`);
                  resolve(response.statusCode);
              } catch (error2) {
                  log("Getting Weather failed: %s", error2, responseBody);
                  reject(error2);
              }
          }
        }.bind(this))
      })
    }
  };

  returnOvercastFromCache() {
    var value;
    if (this.cachedWeatherObj && this.cachedWeatherObj["clouds"]) {
        value = parseFloat(this.cachedWeatherObj["clouds"]["all"]);
    }
    return value;
  };
}

module.exports = SunAzimuthAccessory;
