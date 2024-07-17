const suncalc = require('suncalc');
const request = require('request');

class SunlightAccessory {
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
      setInterval(() => { this.getWeather(); }, 294997);
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
      .setCharacteristic(Characteristic.Manufacturer, 'Krillle')
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
    const { lat, long, apikey, highestAcceptableOvercast } = platformConfig;
    const { lowerThreshold, upperThreshold } = config;
    const threshold = [lowerThreshold, upperThreshold];

    if (!lat || !long || typeof lat !== 'number' || typeof long !== 'number') {
      log('Error: Lat/Long incorrect. Please refer to the README.');
      return 0;
    }

    const sunPos = suncalc.getPosition(Date.now(), lat, long);
    let sunPosDegrees = Math.abs((sunPos.azimuth * 180) / Math.PI + 180);

    if (platformConfig.debugLog) log(`Current azimuth: ${sunPosDegrees}°`);

    if (threshold[0] > threshold[1]) {
      const tempThreshold = threshold[1];
      threshold[1] = threshold[0];
      threshold[0] = tempThreshold;
    }

    let newState;
    if (sunPosDegrees >= threshold[0] && sunPosDegrees <= threshold[1]) {
      newState = true;
    } else {
      newState = false;
    }
    if (threshold[0] < 0 && newState === false) {
      sunPosDegrees = -(360 - sunPosDegrees);
      if (sunPosDegrees >= threshold[0] && sunPosDegrees <= threshold[1]) {
        newState = true;
      } else {
        newState = false;
      }
    }
    if (threshold[1] > 360 && newState === false) {
      sunPosDegrees = 360 + sunPosDegrees;
      if (sunPosDegrees >= threshold[0] && sunPosDegrees <= threshold[1]) {
        newState = true;
      } else {
        newState = false;
      }
    }

    // Sun is in relevant azimuth range, lets check daylight and clouds
    if (newState && apikey) {
      let sunState = this.returnSunFromCache();
      let overcast = this.returnOvercastFromCache();
      if (platformConfig.debugLog) log(`Sun state: ${sunState}%, Cloud state: ${cloudState}%`);
      newState = sunState > 10 && sunState < 90 && overcast <= highestAcceptableOvercast;
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
    const { lat, long, apikey } = platformConfig;

    // Only fetch new data once per minute
    if (!this.cachedWeatherObj || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
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
                  log(`Sun state: ${this.returnSunFromCache()}%, Cloud state: ${this.returnCloudinessFromCache()}%`);
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

  returnSunFromCache() {
    var value;
    if (this.cachedWeatherObj && this.cachedWeatherObj["sys"]) {
        var sunrise = parseInt(this.cachedWeatherObj["sys"]["sunrise"]);
        var sunset = parseInt(this.cachedWeatherObj["sys"]["sunset"]);
        var now = Math.round(new Date().getTime() / 1000);
        if (now > sunset) {
            // It's already dark outside
            value = 100;
        } else if (now > sunrise) {
            // calculate how far though the day (where day is from sunrise to sunset) we are
            var intervalLen = (sunset - sunrise);
            value = (((now - sunrise) / intervalLen) * 100).toFixed(2);
        } else {
          value = 0;
        }
    }
    return value;
  };

}

module.exports = SunlightAccessory;
