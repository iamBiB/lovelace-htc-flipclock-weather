# HomeAssistant HTC Flipclock with Weather card
[![](https://img.shields.io/github/release/ibBogdan/htc-hassio-weather-card.svg?style=flat-square)](https://github.com/ibBogdan/htc-hassio-weather-card/releases/latest)

HTC Flip clock with weather for [Home Assistant](https://github.com/home-assistant/home-assistant)


![image](https://user-images.githubusercontent.com/12171894/78754666-89a09a00-7980-11ea-90bb-3b5783f6258e.png)
![image](https://user-images.githubusercontent.com/12171894/78754777-c076b000-7980-11ea-99d9-01f44968d7b5.png)

## Notes
This version requires jQuery (already in the package). I'll probably do a version with no jQuery without the flip clock animation. 

## Install

### CLI install

1. Move into your `config/www/custom_ui` directory

2. Download `htc-weather` repo and add the `htc-weather` to step 1 folder. 

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
| svrOffset | int | optional | If you need offset on time.
| renderForecast | bool | optional | Render forecast (only 4 days).
| renderClock | bool | optional | Render clock.
| renderDetails | bool | optional | Render sunt details and wind.


### Example usage

#### Standard card
```yaml
- type: 'custom:htc-weather-card'
  entity: weather.home
  sun: sun.sun
```

## Problems?
There might be :D .. So give me a shout for issues or even updates :D

## License
This project is under the MIT license.
