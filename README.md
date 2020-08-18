# HomeAssistant HTC Flipclock with Weather card
[![](https://img.shields.io/github/release/ibBogdan/htc-hassio-weather-card.svg?style=flat-square)](https://github.com/ibBogdan/htc-hassio-weather-card/releases/latest)

HTC Flip clock with weather for [Home Assistant](https://github.com/home-assistant/home-assistant)

### White theme
![image](https://user-images.githubusercontent.com/12171894/78888654-bfba4880-7a6a-11ea-9248-31db9ed43255.png)
### Dark theme
![image](https://user-images.githubusercontent.com/12171894/78888854-2b9cb100-7a6b-11ea-908a-949fbc2dd867.png)
### With custom entity
![image](https://user-images.githubusercontent.com/12171894/78868363-7ad2e980-7a4b-11ea-8d70-e10dd342c715.png)


# Support
Hey dude! If you like it .. well :beers: or a :coffee: would be nice :D

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/fhc0C7A)

## Notes
This version requires jQuery (already in the package). I'll probably do a version with no jQuery without the flip clock animation. 

## Install

### REQUIREMENTS
The time is based on time_date sensors. In order for the plugin to work you need to create the following sensors in your HA
```
platform: time_date
display_options:
    - time
    - date
    - date_time
    - date_time_utc
    - date_time_iso
    - time_date
    - time_utc
    - beat
```

### CLI install

1. Move into your `config/www/custom_ui` directory

2. Download `lovelace-htc-flipclock-weather` repo and add the `htc-weather` to step 1 folder. 

3. Add a reference to `htc-flipclock-weather.js` inside your `ui-lovelace.yaml` or through the raw config editor gui.

    ```yaml
    resources:
      - url: /local/custom_ui/htc-weather/htc-flipclock-weather.js?v1.0.2
        type: module
    ```


### Simple install
* Not yet available. I'll see how to upload it to [HACS](https://github.com/custom-components/hacs) (Home Assistant Community Store)

## Updating
1. Simple, do the steps from CLI Install again :D

## Using the card

### Options

#### Card options
| Name | Type | Default | Description |
|------|------|---------|-------------|
| type | string | **required** | `custom:htc-weather-card`
| entity | string | **required** | The entity_id from an entity within the `weather` domain.
| name | string | optional | Set a custom name.
| lang | string | optional | Set a language (ro/en available).
| am_pm | string | optional | Set clock in AM/PM format.
| svrOffset | int | optional | If you need offset on time (seconds).
| renderForecast | bool | optional | Render forecast (only 4 days).
| renderClock | bool | optional | Render clock.
| renderDetails | bool | optional | Render sunt details and wind.
| high_low_entity | bool | optional | Replace high / low temperature with a custom entity. Params available entity_id, name. Default high / low temperature today


### Example usage

#### Standard card
```yaml
- type: 'custom:htc-weather-card'
  entity: weather.home
  sun: sun.sun
```
#### With custom high_low_entity entity
```yaml
- type: 'custom:htc-weather-card'
  entity: weather.dark_sky
  sun: sun.sun
  high_low_entity:
    entity_id: sensor.time_utc
    name: UTC Time
```

## Problems?
There might be :D .. So give me a shout for issues or even updates :D

## License
This project is under the MIT license.
