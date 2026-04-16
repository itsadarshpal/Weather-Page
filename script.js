const API_KEY = 'd27f9ee5884e365faf474bf8a74e62be';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    cityName: document.getElementById('city-name'),
    weatherIcon: document.getElementById('weather-icon'),
    temperature: document.getElementById('temperature'),
    weatherDescription: document.getElementById('weather-description'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    forecastContainer: document.getElementById('forecast-container'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    weatherCard: document.querySelector('.weather-card')
};

const weatherCache = {
    current: {},
    forecast: {},
    getCacheKey: (type, query) => `${type}_${query}`,
    set: function(type, query, data) {
        const key = this.getCacheKey(type, query);
        this[type][key] = {
            data,
            timestamp: Date.now()
        };
    },
    get: function(type, query) {
        const key = this.getCacheKey(type, query);
        const cached = this[type][key];
        if (cached && (Date.now() - cached.timestamp) < 30 * 60 * 1000) {
            return cached.data;
        }
        return null;
    }
};

const iconMap = {
    '01d': 'fas fa-sun',   
    '01n': 'fas fa-moon',    
    '02d': 'fas fa-cloud-sun',  
    '02n': 'fas fa-cloud-moon',
    '03d': 'fas fa-cloud',     
    '03n': 'fas fa-cloud',
    '04d': 'fas fa-cloud',     
    '04n': 'fas fa-cloud',
    '09d': 'fas fa-cloud-rain',
    '09n': 'fas fa-cloud-rain',
    '10d': 'fas fa-cloud-sun-rain',
    '10n': 'fas fa-cloud-moon-rain',
    '11d': 'fas fa-bolt',      
    '11n': 'fas fa-bolt',
    '13d': 'fas fa-snowflake', 
    '13n': 'fas fa-snowflake',
    '50d': 'fas fa-smog',      
    '50n': 'fas fa-smog'
};

const appState = {
    isLoading: false,
    currentCity: null,
    setLoading: function(isLoading) {
        this.isLoading = isLoading;
        elements.loading.style.display = isLoading ? 'block' : 'none';
        elements.weatherCard.style.display = isLoading ? 'none' : 'block';
    },
    showError: function(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = message ? 'block' : 'none';
    }
};

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

async function fetchWeatherData(type, query) {
    const cachedData = weatherCache.get(type, query);
    if (cachedData) return cachedData;
    
    try {
        let url;
        if (type === 'current') {
            url = `${BASE_URL}/weather?q=${query}&units=metric&appid=${API_KEY}`;
        } else {
            url = `${BASE_URL}/forecast?q=${query}&units=metric&appid=${API_KEY}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(type === 'current' ? 'City not found' : 'Forecast not available');
        
        const data = await response.json();
        weatherCache.set(type, query, data);
        return data;
    } catch (error) {
        console.error(`Error fetching ${type} weather:`, error);
        throw error;
    }
}

function displayWeather(data) {
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    const iconCode = data.weather[0].icon;
    elements.weatherIcon.innerHTML = `<i class="${iconMap[iconCode] || 'fas fa-question'}"></i>`;
    elements.temperature.textContent = `${Math.round(data.main.temp)}°C`;
    elements.weatherDescription.textContent = data.weather[0].description;
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    
    elements.weatherCard.classList.add('show');
}

function displayForecast(data) {
    const dailyForecast = {};
    const today = new Date().toLocaleDateString('en', { weekday: 'short' });
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en', { weekday: 'short' });
        
        if (day === today || Object.keys(dailyForecast).length >= 5) return;
        
        if (!dailyForecast[day]) {
            dailyForecast[day] = {
                minTemp: item.main.temp_min,
                maxTemp: item.main.temp_max,
                icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        } else {
            if (item.main.temp_min < dailyForecast[day].minTemp) {
                dailyForecast[day].minTemp = item.main.temp_min;
            }
            if (item.main.temp_max > dailyForecast[day].maxTemp) {
                dailyForecast[day].maxTemp = item.main.temp_max;
            }
        }
    });

    elements.forecastContainer.innerHTML = '';
    Object.keys(dailyForecast).forEach(day => {
        const forecast = dailyForecast[day];
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-icon"><i class="${iconMap[forecast.icon] || 'fas fa-question'}"></i></div>
            <div class="forecast-temp">
                <span class="high-temp">${Math.round(forecast.maxTemp)}°</span>
                <span class="low-temp">${Math.round(forecast.minTemp)}°</span>
            </div>
        `;
        elements.forecastContainer.appendChild(forecastItem);
    });
}

async function loadWeather(city) {
    if (appState.isLoading || !city) return;
    
    appState.setLoading(true);
    appState.showError('');
    
    try {
        const [currentData, forecastData] = await Promise.all([
            fetchWeatherData('current', city),
            fetchWeatherData('forecast', city)
        ]);
        
        appState.currentCity = city;
        localStorage.setItem('lastCity', city);
        displayWeather(currentData);
        displayForecast(forecastData);
    } catch (error) {
        appState.showError(error.message || 'Failed to load weather data');
    } finally {
        appState.setLoading(false);
    }
}

function getLocationWeather() {
    if (navigator.geolocation) {
        appState.setLoading(true);
        appState.showError('');
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`);
                    if (!response.ok) throw new Error('Location weather not available');
                    const data = await response.json();
                    await loadWeather(data.name);
                } catch (error) {
                    appState.showError(error.message);
                } finally {
                    appState.setLoading(false);
                }
            },
            (error) => {
                appState.showError('Geolocation error: ' + error.message);
                appState.setLoading(false);
            }
        );
    } else {
        appState.showError('Geolocation is not supported by your browser');
    }
}

const debouncedSearch = debounce(() => {
    const city = elements.cityInput.value.trim();
    if (city) {
        loadWeather(city);
    }
}, 500);

elements.searchBtn.addEventListener('click', debouncedSearch);
elements.locationBtn.addEventListener('click', getLocationWeather);

elements.cityInput.addEventListener('input', debouncedSearch);
elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        debouncedSearch();
    }
});

function initApp() {
    const lastCity = localStorage.getItem('lastCity') || 'London';
    elements.cityInput.value = lastCity;
    loadWeather(lastCity);
}

initApp();

