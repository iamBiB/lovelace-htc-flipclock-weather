const LitElement = Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;
var old_time = {}
var intervalSetNewTime = ''

const weatherDefaults = {
	widgetPath: '/local/custom_ui/htc-weather/',
    lang: 'en',
    am_pm: false,
    weatherLocationCode: '751090',
    SolarCalendarLocationCode: 'DEPT75',
    weatherUpdate: 30,
    svrOffset: 0,
    renderForecast: true,
    renderClock: true,
    renderDetails: true
};
weatherDefaults['imagesPath'] = weatherDefaults.widgetPath+'images/'
weatherDefaults['clockImagesPath'] = weatherDefaults.imagesPath+'clock/'
weatherDefaults['weatherImagesPath'] = weatherDefaults.imagesPath+'weather/'
var regional = [];
regional['ro'] = {
    monthNames: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sept', 'Oct', 'Noi', 'Dec'],
    dayNames: ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam'],
    lang: 'ro'
}
regional['en'] = {
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    lang: 'en'
}


const weatherIconsDay = {
  clear: "sunny",
  "clear-night": "night",
  cloudy: "cloudy",
  fog: "fog",
  hail: "hail",
  lightning: "thunder",
  "lightning-rainy": "thunder",
  partlycloudy: "partlycloudy",
  pouring: "pouring",
  rainy: "pouring",
  snowy: "snowy",
  "snowy-rainy": "snowy-rainy",
  sunny: "sunny",
  windy: "cloudy",
  "windy-variant": "cloudy-day-3",
  exceptional: "na"
};

const weatherIconsNight = {
  ...weatherIconsDay,
  fog: "fog",
  clear: "night",
  sunny: "night",
  partlycloudy: "cloudy-night-3",
  "windy-variant": "cloudy-night-3"
};


const windDirections = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
  "N"
];

const fireEvent = (node, type, detail, options) => {
    options = options || {};
    detail = detail === null || detail === undefined ? {} : detail;
    const event = new Event(type, {
        bubbles: options.bubbles === undefined ? true : options.bubbles,
        cancelable: Boolean(options.cancelable),
        composed: options.composed === undefined ? true : options.composed
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
};

function hasConfigOrEntityChanged(element, changedProps) {
    if (changedProps.has("_config")) {
        return true;
    }
    const oldHass = changedProps.get("hass");
    if (oldHass) {
        return (
            oldHass.states[element._config.entity] !==
            element.hass.states[element._config.entity] ||
            oldHass.states["sun.sun"] !== element.hass.states["sun.sun"] ||
            oldHass.states["sensor.date_time_iso"] !== element.hass.states["sensor.date_time_iso"]
        );
    }
    return true;
}

class HtcWeather extends LitElement {
  	
    static get getConfig(){
        return this._config;
    }
    static set setConfig(config){
        this._config = config;
    }
    static get getHass(){
        return this.hass;
    }
    static set setHass(hass){
        this.hass = hass;
    }
    static get properties() {
        return {
            _config: this.getConfig,
            hass: this.getHass
        };
    }

  	async importJquery() {
    	await import("./lib/jquery-3.4.1.min.js")
    	return {config:this._config, entity: this.hass.states[this._config.entity], hass_states:this.hass.states}
  	}

  	static getStubConfig() {
    	return {};
  	}

    setConfig(config) {
        if (!config.entity) {
          	throw new Error("Please define a weather entity");
        }
        var defaultConfig = {}
        for (const property in config) {
        	defaultConfig[property] = config[property]
        }
        for (const property in weatherDefaults) {
    	  	if(config[property] === undefined){
    	  		defaultConfig[property] = weatherDefaults[property]
    	  	}
    	}
    	this._config = defaultConfig;
    }
    shouldUpdate(changedProps) {
        var shouldUpdate = hasConfigOrEntityChanged(this, changedProps);
        if(shouldUpdate){
            HtcWeather.setHass = this.hass
        }
        return shouldUpdate;
    }

    render() {
        if (!this._config || !this.hass) {
            return html``;
        }
        HtcWeather.setConfig = this._config
        HtcWeather.setHass = this.hass
        

        this.numberElements = 0;

        const stateObj = this.hass.states[this._config.entity];
        if (!stateObj) {
          return html`
            <style>
              .not-found {
                flex: 1;
                background-color: red;
                padding: 8px;
              }
            </style>
            <ha-card>
              <div class="not-found">
                Entity not available/installed: ${this._config.entity}
              </div>
            </ha-card>
          `;
        }
        return this.renderCard()
    }
  	renderCard() {
	  	this.numberElements++;
	  	old_time = HtcWeather.getOldTime(this._config)
	  	const stateObj = this.hass.states[this._config.entity];
	    const root = this.shadowRoot;
	    if (root.lastChild) root.removeChild(root.lastChild);

	    const script = document.createElement('script');
	    script.textContent = this.getScript();
	    root.appendChild(script);

	    const style = document.createElement('style');
	    style.textContent = this.getStyle();
	    root.appendChild(style);

	    const card = document.createElement('ha-card');
	    card.header = this._config.title;
	    root.appendChild(card);
	    var container_size = '470px'
	    if(!this._config.renderForecast){
	    	var container_size = '320px'
	    }
	    const container = document.createElement('div');
	    container.id = 'htc-weather-card-container';
	    // container.onclick = this._handleClick(this._config.entity)
    	container.style = `height: ${container_size};background:url(${weatherDefaults.imagesPath}background.png) 50% 40px no-repeat;`	
	    card.appendChild(container);

	    const htc_clock = document.createElement('div')
	    htc_clock.id = 'htc-clock'
	    htc_clock.classList.add(`htc-clock-${this.numberElements}`)
	    container.appendChild(htc_clock)

	    const htc_clock_hours = document.createElement('div')
	    htc_clock_hours.id = 'hours'
	    htc_clock.appendChild(htc_clock_hours)

	    const htc_clock_hours_line = document.createElement('div')
	    htc_clock_hours_line.classList.add('line')
	    htc_clock_hours.appendChild(htc_clock_hours_line)

	    const hours_bg = document.createElement('div')
	    hours_bg.id = 'hours_bg'
	    htc_clock_hours.appendChild(hours_bg)

	    const hours_bg_img = document.createElement('img')
	    hours_bg_img.src = `${this._config.clockImagesPath + 'clockbg1.png'}`
	    htc_clock_hours.appendChild(hours_bg_img)

	    const hours_bg_first = document.createElement('img')
	    hours_bg_first.id = 'fhd';
	    hours_bg_first.src = `${this._config.clockImagesPath + old_time.firstHourDigit + '.png'}`
	    hours_bg_first.classList.add('first_digit')
	    htc_clock_hours.appendChild(hours_bg_first)

	    const hours_bg_second = document.createElement('img')
	    hours_bg_second.id = 'shd'
	    hours_bg_second.src = `${this._config.clockImagesPath + old_time.secondHourDigit + '.png'}`
	    hours_bg_second.classList.add('second_digit')
	    htc_clock_hours.appendChild(hours_bg_second)

	    const htc_clock_minutes = document.createElement('div')
	    htc_clock_minutes.id = 'minutes'
	    htc_clock.appendChild(htc_clock_minutes)

	    const htc_clock_minutes_bg = document.createElement('div')
	    htc_clock_minutes_bg.id = 'minutes_bg'
	    htc_clock_minutes.appendChild(htc_clock_minutes_bg)
	    

	    const hours_min_img = document.createElement('img')
	    hours_min_img.src = `${this._config.clockImagesPath + 'clockbg1.png'}`
	    htc_clock_minutes.appendChild(hours_min_img)

	    const htc_clock_minutes_line = document.createElement('div')
	    htc_clock_minutes_line.classList.add('line')
	    htc_clock_minutes.appendChild(htc_clock_minutes_line)
	    
	    if(this._config.am_pm !== false){

	    	const htc_clock_am_pm = document.createElement('div')
		    htc_clock_am_pm.id = 'am_pm'
		    htc_clock.appendChild(htc_clock_am_pm)

		    const am_pm_img = document.createElement('img')
		    am_pm_img.src = `${this._config.clockImagesPath +'am.png'}`
		    htc_clock_am_pm.appendChild(am_pm_img)
	    }

	    const min_bg_first = document.createElement('img')
	    min_bg_first.id = 'fmd'
	    min_bg_first.src = `${this._config.clockImagesPath + old_time.firstMinuteDigit + '.png'}`
	    min_bg_first.classList.add('first_digit')
	    htc_clock_minutes.appendChild(min_bg_first)

	    const min_bg_second = document.createElement('img')
	    min_bg_second.id = 'smd'
	    min_bg_second.src = `${this._config.clockImagesPath + old_time.secondMinuteDigit + '.png'}`
	    min_bg_second.classList.add('second_digit')
	    htc_clock_minutes.appendChild(min_bg_second)

	    const htc_weather = document.createElement('div')
	    htc_weather.id = 'htc-weather'
	    htc_weather.classList.add(`htc-weather-${this.numberElements}`)
	    container.appendChild(htc_weather)

	    const spinner = document.createElement('p')
	    spinner.classList.add('loading')
	    spinner.innerHTML = `Fetching weather...`
	    htc_weather.appendChild(spinner)

	    if(!window.jQuery){
	    	this.importJquery().then(function(result){
		    	HtcWeather.setNewTime(htc_clock)
		    	HtcWeather.setNewWeather(htc_weather)
		    })	
	    }else{
	    	HtcWeather.setNewTime(htc_clock)
	    	HtcWeather.setNewWeather(htc_weather)
	    }
  	}
    static setNewWeather(elem){
        var config = HtcWeather.getConfig;
        var stateObj = HtcWeather.getHass.states[HtcWeather.getConfig.entity];
        var hass_states = HtcWeather.getHass.states;
    	var temp_now = Math.round(stateObj.attributes.temperature * 100) / 100
    	var weatherIcon = HtcWeather.getWeatherIcon(config, stateObj.state)
        var curr_temp = `<p class="temp">${String(temp_now)}
                       <span class="metric">
                       ${HtcWeather.getUnit("temperature")}</span></p>`;
    	$(elem).css('background','url('
                 + weatherIcon 
                 + ') 50% 0 no-repeat');
     	var weather = `<div id="local"><p class="city">${stateObj.attributes.friendly_name}</p><p class="high_low">
                            ${stateObj.attributes.forecast[0].temperature}&deg;`
      	if(stateObj.attributes.forecast[0].templow){
      		weather += `&nbsp;/&nbsp;${stateObj.attributes.forecast[0].templow}&deg;`;
      	}
      	weather += '</p></div>';
     	weather += '<div id="temp"><p id="date">&nbsp</p>'  + curr_temp + '</div>';

     	$(elem).html(weather);
     	if(config.renderForecast){
     		$(elem).append('<ul id="forecast"></ul>');
         
			for (var i = 0; i <= 3; i++) {

				var d_day_code = String(i) + '_resume';
				var d_date = new Date(stateObj.attributes.forecast[i].datetime);
                var forecastIcon =  HtcWeather.getWeatherIcon(config, stateObj.attributes.forecast[i].condition, hass_states)
				var forecast = `<li>`;
				forecast    += `<p class="dayname">${regional[config.lang]['dayNames'][d_date.getDay()]}&nbsp;${d_date.getDate()}</p>
				                <img src="${forecastIcon}" alt="${stateObj.attributes.forecast[i].condition}" title="${stateObj.attributes.forecast[i].condition}" />
				                <div class="daytemp">${stateObj.attributes.forecast[i].temperature}${this.getUnit("temperature")}`
				if(stateObj.attributes.forecast[0].templow){
		      		forecast += `&nbsp;/&nbsp;${stateObj.attributes.forecast[0].templow}${this.getUnit("temperature")}`;
		      	}
		      	forecast += `</div></li>`;
				$(elem).find('#forecast').append(forecast);
     		}
	    }
	    if(config.renderDetails){
	    	HtcWeather.renderDetails(elem, config,stateObj,hass_states)	
	    }
	}
    static getOldTime(config) {
        var localtime = new Date(HtcWeather.getHass.states["sensor.date_time_iso"].state);
        var now = new Date(localtime.getTime() - config.svrOffset);
        var old = new Date();
        old.setTime(now.getTime() - 60000);
        
        var old_hours, old_minutes, timeOld = '';
        old_hours =  old.getHours();
        old_minutes = old.getMinutes();

        if (config.am_pm) {
            old_hours = ((old_hours > 12) ? old_hours - 12 : old_hours);
        } 

        old_hours   = ((old_hours <  10) ? "0" : "") + old_hours;
        old_minutes = ((old_minutes <  10) ? "0" : "") + old_minutes;

        var firstHourDigit = old_hours.substr(0,1);
        var secondHourDigit = old_hours.substr(1,1);
        var firstMinuteDigit = old_minutes.substr(0,1);
        var secondMinuteDigit = old_minutes.substr(1,1);
        var old_time = {
        	firstHourDigit : firstHourDigit,
        	secondHourDigit: secondHourDigit,
        	firstMinuteDigit : firstMinuteDigit,
        	secondMinuteDigit: secondMinuteDigit,
        	old_hours:old_hours,
        	old_minutes:old_minutes
		}
		return old_time
        // set minutes
    }
    static setNewTime(elem){
        var config = HtcWeather.getConfig
    	var localtime = new Date(HtcWeather.getHass.states["sensor.date_time_iso"].state);
        var now = new Date(localtime.getTime() - config.svrOffset);
        var old = new Date();
        old.setTime(now.getTime() - 60000);
        
        var now_hours, now_minutes, old_hours, old_minutes, timeOld = '';
        now_hours =  now.getHours();
        now_minutes = now.getMinutes();
        old_hours =  old.getHours();
        old_minutes = old.getMinutes();

        if (config.am_pm) {
            var am_pm = now_hours > 11 ? 'pm' : 'am';
            $(elem).find("#am_pm").find('img').attr("src",config.clockImagesPath + am_pm+".png")
            now_hours = ((now_hours > 12) ? now_hours - 12 : now_hours);
            old_hours = ((old_hours > 12) ? old_hours - 12 : old_hours);
        } 

        now_hours   = ((now_hours <  10) ? "0" : "") + now_hours;
        now_minutes = ((now_minutes <  10) ? "0" : "") + now_minutes;
        old_hours   = ((old_hours <  10) ? "0" : "") + old_hours;
        old_minutes = ((old_minutes <  10) ? "0" : "") + old_minutes;

        var firstHourDigit = old_hours.substr(0,1);
        var secondHourDigit = old_hours.substr(1,1);
        var firstMinuteDigit = old_minutes.substr(0,1);
        var secondMinuteDigit = old_minutes.substr(1,1);

    	if (secondMinuteDigit != '9') {
            firstMinuteDigit = firstMinuteDigit + '1';
        }

        if (old_minutes == '59') {
            firstMinuteDigit = '511';
        }
        var fmd = $(elem).find("#fmd")
        var smd = $(elem).find("#smd")
        
        setTimeout(function() {
            $(fmd).attr('src', config.clockImagesPath + firstMinuteDigit + '-1.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg2.png');
        },200);
        setTimeout(function() { $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg3.png')},250);
        setTimeout(function() {
            $(fmd).attr('src', config.clockImagesPath + firstMinuteDigit + '-2.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg4.png');
        },400);
        setTimeout(function() { $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg5.png')},450);
        setTimeout(function() {
            $(fmd).attr('src', config.clockImagesPath + firstMinuteDigit + '-3.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg6.png');
        },600);

        setTimeout(function() {
            $(smd).attr('src', config.clockImagesPath + secondMinuteDigit + '-1.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg2.png');
        },200);
        setTimeout(function() { $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg3.png')},250);
        setTimeout(function() {
            $(smd).attr('src', config.clockImagesPath + secondMinuteDigit + '-2.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg4.png');
        },400);
        setTimeout(function() { $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg5.png')},450);
        setTimeout(function() {
            $(smd).attr('src', config.clockImagesPath + secondMinuteDigit + '-3.png');
            $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg6.png');
        },600);

        setTimeout(function() {$(fmd).attr('src', config.clockImagesPath + now_minutes.substr(0,1) + '.png')},800);
        setTimeout(function() {$(smd).attr('src', config.clockImagesPath + now_minutes.substr(1,1) + '.png')},800);
        setTimeout(function() { $(elem).find('#minutes_bg').find('img').attr('src', config.clockImagesPath + 'clockbg1.png')},850);

        if (now_minutes == '00') {
           
            if (config.am_pm) {
                if (now_hours == '00') {                   
                    firstHourDigit = firstHourDigit + '1';
                    now_hours = '12';
                } else if (now_hours == '01') {
                    firstHourDigit = '001';
                    secondHourDigit = '111';
                } else {
                    firstHourDigit = firstHourDigit + '1';
                }
            } else {
                if (now_hours != '10') {
                    firstHourDigit = firstHourDigit + '1';
                }

                if (now_hours == '20') {
                    firstHourDigit = '1';
                }

                if (now_hours == '00') {
                    firstHourDigit = firstHourDigit + '1';
                    secondHourDigit = secondHourDigit + '11';
                }
            }
            var fhd = $(elem).find('#fhd')
            var shd = $(elem).find('#shd')
            setTimeout(function() {
                $(fhd).attr('src', config.clockImagesPath + firstHourDigit + '-1.png');
                $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg2.png');
            },200);
            setTimeout(function() { $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg3.png')},250);
            setTimeout(function() {
                $(fhd).attr('src', config.clockImagesPath + firstHourDigit + '-2.png');
                $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg4.png');
            },400);
            setTimeout(function() { $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg5.png')},450);
            setTimeout(function() {
                $(fhd).attr('src', config.clockImagesPath + firstHourDigit + '-3.png');
                $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg6.png');
            },600);

            setTimeout(function() {
            	$(shd).attr('src', config.clockImagesPath + secondHourDigit + '-1.png');
            	$(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg2.png');
            },200);
            setTimeout(function() { $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg3.png')},250);
            setTimeout(function() {
                $(shd).attr('src', config.clockImagesPath + secondHourDigit + '-2.png');
                $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg4.png');
            },400);
            setTimeout(function() { $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg5.png')},450);
            setTimeout(function() {
                $(shd).attr('src', config.clockImagesPath + secondHourDigit + '-3.png');
                $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg6.png');
            },600);

            setTimeout(function() {$(fhd).attr('src', config.clockImagesPath + now_hours.substr(0,1) + '.png')},800);
            setTimeout(function() {$(shd).attr('src', config.clockImagesPath + now_hours.substr(1,1) + '.png')},800);
            setTimeout(function() { $(elem).find('#hours_bg').find('img').attr('src', config.clockImagesPath + 'clockbg1.png')},850);
        }
    }
    static getUnit(measure) {
        const lengthUnit = HtcWeather.getHass.config.unit_system.length;
        switch (measure) {
            case "air_pressure":
                return lengthUnit === "km" ? "hPa" : "inHg";
            case "length":
                return lengthUnit;
            case "precipitation":
                return lengthUnit === "km" ? "mm" : "in";
            default:
                return HtcWeather.getHass.config.unit_system[measure] || "";
        }
    }

  	static renderDetails(elem, config,stateObj,hass_states) {
  	
	    const sun = hass_states["sun.sun"];
	    let next_rising;
	    let next_setting;

	    if (sun) {
	      	next_rising = new Date(sun.attributes.next_rising);
	      	next_setting = new Date(sun.attributes.next_setting);
	      	$(elem).append(`<div id="bottom">
	      		<div id="sun_details"></div>
	      		<div id="wind_details"></div>
	      		<div id="update">
	      			<img src="${config.imagesPath}refresh_grey.png" alt="Last update" title="Last update" id="reload" />${new Date(stateObj.last_updated).toLocaleTimeString()}
      			</div>
  			</div>`);
	    	var sun_details = `<font color="orange">☀</font> <font color="green"><ha-icon icon="mdi:weather-sunset-up"></ha-icon></font>&nbsp;${next_rising.toLocaleTimeString()}&nbsp;&nbsp;&nbsp;<font color="red"><ha-icon icon="mdi:weather-sunset-down"></ha-icon></font>&nbsp;${next_setting.toLocaleTimeString()}`;
	    	$(elem).find('#sun_details').append(sun_details);	
		    $(elem).find('#wind_details').append(`
		    		<span class="ha-icon"><ha-icon icon="mdi:weather-windy"></ha-icon></span>
		    		${
		                windDirections[
		                  parseInt((stateObj.attributes.wind_bearing + 11.25) / 22.5)
		                ]
		          	} ${stateObj.attributes.wind_speed}<span class="unit">
                	${this.getUnit("length")}/h</span>
		    	`);
	    }
        return
    }

    static getWeatherIcon(config, condition) {
        var hass_states = HtcWeather.getHass.states
        return `${config.weatherImagesPath}${
            hass_states["sun.sun"] && hass_states["sun.sun"] == "below_horizon"
            ? weatherIconsNight[condition]
            : weatherIconsDay[condition]
        }.png`;
    }

    _handleClick(entity) {
        fireEvent(this, "hass-more-info", { entityId: entity });
    }

    getCardSize() {
        return 3;
    }
    getScript(){}

    getStyle() {
        return css`

            #htc-weather-card-container {
    		    width:440px;
    		    height:448px;
    		    background:url(images/background.png) 50% 40px no-repeat;
    		    position:relative;
    		    overflow:hidden;
    		    font-family:Arial, Verdana, Tahoma, Helvetica, sans-serif;
    		    margin: auto;
    		}

    		#htc-weather-card-container p {
    		    margin:0;
    		    padding:0;
    		}

    		#htc-clock {
    		    float:left;
    		    margin-left:18px;
    		}

    		#hours, #minutes {
    		    width:200px;
    		    height:200px;
    		    float:left;
    		    position:relative;
    		}

    		#minutes {
    		    margin-left:4px;
    		}

    		#hours_bg, #minutes_bg {
    		    width:100%;
    		    height:100%;
    		    position:absolute;
    		    top:0;
    		    left:0;
    		    z-index:99;
    		}

    		.first_digit {
    		    width:80px;
    		    height:100%;
    		    position:absolute;
    		    top:0;
    		    left:20px;
    		    z-index:100;
    		}

    		.second_digit {
    		    width:80px;
    		    height:100%;
    		    position:absolute;
    		    top:0;
    		    left:100px;
    		    z-index:100;
    		}

    		.line {
    		    width:175px;
    		    height:2px;
    		    background:#efefef;
    		    position:absolute;
    		    top:97px;
    		    left:12px;
    		    z-index:101;
    		    font-size:1px;
    		}

    		#am_pm {
    		    position:absolute;
    		    top:156px;
    		    left:130px;
    		    z-index:110;
    		}


    		#htc-weather {
    		    width:100%;
    		    height:313px;
    		    position:absolute;
    		    top:135px;
    		    left:0;
    		    z-index:105;
    		}

    		#htc-weather .loading {
    		    float:left;
    		    margin:90px 0 0 45px;
    		}
    		#htc-weather #local {
    		    float:left;
    		    margin:70px 0 0 15px;
    		    color: #fff
    		}

    		.city {
    		    font-size:12pt;
    		}
    		.high_low {
    		    font-size:18pt;
    		}

    		#htc-weather #temp {
    		    float:right;
    		    margin:60px 15px 0 0;
    		    text-align:right;
    		    color:#fff
    		}

    		#htc-weather #date {
    		    font-size:16pt;
    		    padding-right:2px;
    		}

    		.temp {
    		    font-size:30pt;
    		    padding:0;
    		}

    		.temp .metric {
    		    margin-left:-3px;
    		}


    		#htc-weather #forecast {
    		    width:440px;
    		    height:100px;
    		    list-style:none;
    		    margin:175px 0 0 0px;
    		    padding:0;
    		    position: relative;
    		}
    		#htc-weather #forecast li:first-child {
    		    border-left: 0px solid;
    		}
    		#htc-weather #forecast li {
    		    width:24%;
    		    height:100%;
    		    float:left;
    		    text-align:center;
    		    border-left: 0.1em solid rgb(217, 217, 217);
    		}
    		

    		#htc-weather #forecast li p {
    		    width:100%;
    		    height:15px;
    		    margin:0;
    		    padding:0;
    		    font-size:18pt;
    		    line-height:20px;
    		}

    		#htc-weather #forecast li .dayname {
    		    font-size:12pt;
    		    font-weight: bold;
    		}

    		#htc-weather #forecast li img {
    		    width:106px;
    		}

    		#htc-weather #forecast li .daytemp {
    		    position:absolute;
    		    bottom: 0px;
    		    width: 25%;
    		    text-align:center;
    		    font-weight: bold
    		}


    		#htc-weather #bottom {
    		    text-align:right;
    		    margin: 0px 14px 0px 1px;
    		    height: 25px;
    		}
    		#htc-weather #sun_details {
    		    margin: 4px 0px 0px 0px;
    		    float: left;
    		    text-align:left;
    		    font-size: 14px;
    		}

    		#htc-weather #wind_details{
    			margin: 4px 0px 0px 0px;
    		    float: right;
    		    text-align: left;
    		    font-size: 14px;
    		}

    		#htc-weather #update {
    		    margin:4px 0px 0px 0px;
    		    float:right;
    		    text-align:right;
    		    font-size:10px;
    		    clear: both;
    		}

    		#htc-weather #update img {
    		    margin:-2px 4px 0 0;
    		    vertical-align:middle;
    		    width: 10px;
    		}
        `;
    }
}
customElements.define("htc-weather-card", HtcWeather);