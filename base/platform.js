const SunAzimuthAccessory = require('./accessory');

let homebridge;

class SunAzimuthPlatform {
  constructor(log, config) {
    this.config = config;
    this.log = log;
    this.accessories = [];

    // Initialize accessories
    this.sensors = {};
    config.sensors.forEach((sensorConfig) => {
      this.sensors[sensorConfig.name] = new SunAzimuthAccessory(log, sensorConfig, config);
    });

    // Register new accessories after homebridge loaded
    homebridge.on('didFinishLaunching', this.registerAccessories.bind(this));
  }

  registerAccessories() {
    const { log, config } = this;

    // Unregister removed accessories first
    let tempAccessories = [];
    this.accessories.forEach((accessory) => {
      const configExists = config.sensors.find(
        (sensor) => UUIDGen.generate(sensor.name) === accessory.UUID,
      );

      if (!configExists) {
        log('Removing existing platform accessory from cache:', accessory.displayName);
        try {
          homebridge.unregisterPlatformAccessories('homebridge-sun-azimuth', 'Sun Azimuth', [accessory]);
        } catch (e) {
          log('Could not unregister platform accessory!', e);
        }
      } else {
        tempAccessories.push(accessory);
      }
    });
    this.accessories = tempAccessories;

    tempAccessories = [];
    // Update cached accessories
    if (this.accessories.length > 0) {
      this.accessories.forEach((accessory) => {
        log('Updating cached accesory:', accessory.displayName);
        const sensorConfig = config.sensors.find(
          (sensor) => sensor.name === accessory.displayName,
        );
        if (
          sensorConfig.lowerThreshold === undefined
          || sensorConfig.upperThreshold === undefined
          || typeof sensorConfig.lowerThreshold !== 'number'
          || typeof sensorConfig.upperThreshold !== 'number'
          || sensorConfig.lowerThreshold > 720
          || sensorConfig.lowerThreshold < -360
          || sensorConfig.upperThreshold > 720
          || sensorConfig.upperThreshold < -360) {
          log(`Error: Thresholds of sensor ${sensorConfig.name} are not correctly configured. Please refer to the README. Unregistering this cached accessory.`);
          try {
            homebridge.unregisterPlatformAccessories('homebridge-sun-azimuth', 'Sun Azimuth', [accessory]);
          } catch (e) {
            log('Could not unregister platform accessory!', e);
          }
        } else {
          const sensor = this.sensors[sensorConfig.name];
          sensor.setAccessory(accessory);
          tempAccessories.push(accessory);
        }

        // this.accessories[index] = this.sensors[accessory.displayName].initializeAccessory();
      });
      homebridge.updatePlatformAccessories('homebridge-sun-azimuth', 'Sun Azimuth', this.accessories);
    }
    const configuredAccessories = tempAccessories;
    this.accessories = [];

    // Initialize new accessoroies
    config.sensors.forEach((sensorConfig) => {
      const configured = configuredAccessories.find(
        (accessory) => accessory.UUID === UUIDGen.generate(sensorConfig.name),
      );
      if (configured) return;

      log('Registering accessory:', sensorConfig.name);

      if (
        sensorConfig.lowerThreshold === undefined
        || sensorConfig.upperThreshold === undefined
        || typeof sensorConfig.lowerThreshold !== 'number'
        || typeof sensorConfig.upperThreshold !== 'number'
        || sensorConfig.lowerThreshold > 720
        || sensorConfig.lowerThreshold < -360
        || sensorConfig.upperThreshold > 720
        || sensorConfig.upperThreshold < -360) {
        log(`Error: Thresholds of sensor ${sensorConfig.name} are not correctly configured. Please refer to the README.`);
        return;
      }

      const sensor = this.sensors[sensorConfig.name];
      if (!sensor.hasRegistered()) {
        this.accessories.push(sensor.initializeAccessory());
      }
    });

    // Collect all accessories after initialization to register them with homebridge
    if (this.accessories.length > 0) {
      homebridge.registerPlatformAccessories('homebridge-sun-azimuth', 'Sun Azimuth', this.accessories);
    }
  }

  configureAccessory(accessory) {
    this.accessories.push(accessory);
  }
}

/**
 * Set homebridge reference for platform, called from /index.js
 * @param {object} homebridgeRef The homebridge reference to use in the platform
 */
SunAzimuthPlatform.setHomebridge = (homebridgeRef) => {
  homebridge = homebridgeRef;
};

module.exports = SunAzimuthPlatform;
