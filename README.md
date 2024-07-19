<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Sun Azimuth

This is a plugin for [homebridge](https://github.com/nfarina/homebridge). It provides contact sensors based on sun position and clouds to automate sun protection. Sensors are opened when the sun is in a defined section of the sky (azimuth) and optionally if an [OpenWeather API key](https://openweathermap.org/api) is provided when the sky is not overcast and sun is above the horizon.

# Installation
Intall via hombridge GUI [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) or manually via:

1.  Install homebridge (if not already installed) using: `npm install -g homebridge`
2.  Install this plugin using: `npm install -g homebridge-sun-azimuth`
3.  Update your configuration file (see below).

# Example Configuration

See `config-sample.json` for an example config. This plugin can also be configured through a GUI like [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).

## Platform Configuration

| Parameter  | Note                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `lat`      | Latitude of the location the sun position should be calculated for   |
| `long`     | Longitude of the location the sun position should be calculated for  |
| `apikey`   | Your [OpenWeather API key](https://openweathermap.org/api), optional  |
| `enableWeatherIntegration` | Enables the weather integration if an OpenWeather API key is set. Turn this off to keep the weather debug output but disable the overcast checks. |
| `highestAcceptableOvercast` | Overcast threshold in percent which is considered as sunny and below which the sensor should be activated. Lower values are sunny, higher values are cloudy. When automating window covers, setting lower values here will open window covers for just few clouds while higher values will keep them shut even if the sky is cloudy. Only available if an OpenWeather API key is defined and weather integration is enabled. |
| `weatherUpdateIntervalSeconds` | The smaller the interval, the quicker the response to sun position and overcast updates but the more traffic it'll create. The free tier of the OpenWeather API is limited to 1,000,000 requests per month which is roughly one call every 3 seconds for a whole month. |
| `sensors`  | Array of objects containing configuration for the sensors, see below |
| `debugLog` | Debug log output, optional, default: false                 |

## Sensors Configuration

Define contact sensors for one or more sections of the sky, e.g. for windows looking to different directions. Direction is specified in degrees of compass: 0° North, 90° East, 180° South, 270° West. To define overlaps you can use values between -360° and 0° as well as 360° and 720°.

| Parameter   | Note                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `name`           | Display name of the sensor                                                                                |
| `lowerThreshold` | Left side of sky section within which the sensor should activate |
| `upperThreshold` | Right side of sky section within which the sensor should activate |
| `minimumTemperatureCelsuisConsideredSunny` | Sets a minimum temperature that is required so that the sensor can be activated. If the temperature stays below this value, the sensor will not activate which allows automated windows blinds to stay open on cold days. Only available if an OpenWeather API key is defined and weather integration is enabled. |
| `lowerAltitudeThreshold` | Lower altitude threshold for the sun's position above the horizon, above which the sensor should activate. The threshold is measured in degrees, with 0° being on the horizon and 90° being at the zenith. |
| `upperAltitudeThreshold` | Upper altitude threshold for the sun's position above the horizon, below which the sensor should activate. The threshold is measured in degrees, with 0° being on the horizon and 90° being at the zenith. |

**Thresholds example**: If you want the sensor to turn on when the sun is between 0° and 90° azimuth, set the lower threshold to 0 and the upper threshold to 90. See the example configuration file for a basic set-up (north, east, south, west).

For help or in case of issues please visit the [GitHub repository](https://github.com/awaescher/homebridge-sun-azimuth/issues).    
This plugin is based  on [homebridge-sunsensors](https://github.com/mfkrause/homebridge-sunsensors) and [homebridge-sunlight](https://github.com/Krillle/homebridge-sunlight)..