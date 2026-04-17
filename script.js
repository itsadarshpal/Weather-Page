// Configuration
const CONFIG = {
    API_KEY: '9de243494c0b295cca9337e1e96b00e2', // Replace with your OpenWeatherMap API key
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0',
    UNITS: 'metric',
    UPDATE_INTERVAL: 600000, // 10 minutes
};

// State Management
const state = {
    currentWeather: null,
    forecast: null,
    airQuality: null,
    units: 'metric',
    city: 'London',
    country: 'GB',
    theme: 'dark',
    chart: null,
    alerts: [],
};

// DOM Elements
const elements = {
    // Header
    citySearch: document.getElementById('citySearch'),
    voiceSearchBtn: document.getElementById('voiceSearchBtn'),
    geoLocateBtn: document.getElementById('geoLocateBtn'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    themeToggle: document.getElementById('themeToggle'),
    
    // States
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorText: document.getElementById('errorText'),
    retryBtn: document.getElementById('retryBtn'),
    weatherDashboard: document.getElementById('weatherDashboard'),
    
    // Alert
    alertBanner: document.getElementById('alertBanner'),
    alertMessage: document.getElementById('alertMessage'),
    closeAlert: document.getElementById('closeAlert'),
    
    // Current Weather
    cityDisplay: document.getElementById('cityDisplay'),
    countryDisplay: document.getElementById('countryDisplay'),
    localTime: document.getElementById('localTime'),
    currentTemp: document.getElementById('currentTemp'),
    feelsLikeTemp: document.getElementById('feelsLikeTemp'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherMain: document.getElementById('weatherMain'),
    weatherDesc: document.getElementById('weatherDesc'),
    windStat: document.getElementById('windStat'),
    humidityStat: document.getElementById('humidityStat'),
    pressureStat: document.getElementById('pressureStat'),
    visibilityStat: document.getElementById('visibilityStat'),
    
    // Sun & UV
    sunriseTime: document.getElementById('sunriseTime'),
    sunsetTime: document.getElementById('sunsetTime'),
    sunProgress: document.getElementById('sunProgress'),
    uvIndex: document.getElementById('uvIndex'),
    uvLabel: document.getElementById('uvLabel'),
    uvFill: document.getElementById('uvFill'),
    uvRecommendation: document.getElementById('uvRecommendation'),
    
    // Clothing
    clothingIcon: document.getElementById('clothingIcon'),
    clothingRecommendation: document.getElementById('clothingRecommendation'),
    
    // AQI
    aqiBadge: document.getElementById('aqiBadge'),
    aqiValue: document.getElementById('aqiValue'),
    pm25: document.getElementById('pm25'),
    pm10: document.getElementById('pm10'),
    o3: document.getElementById('o3'),
    
    // Forecast
    hourlyForecast: document.getElementById('hourlyForecast'),
    dailyForecast: document.getElementById('dailyForecast'),
    forecastChart: document.getElementById('forecastChart').getContext('2d'),
    
    // Radar
    radarContainer: document.getElementById('radarContainer'),
    radarFrame: document.getElementById('radarFrame'),
    toggleRadar: document.getElementById('toggleRadar'),
    
    // Toast
    voiceToast: document.getElementById('voiceToast'),
    
    // Background
    weatherBg: document.getElementById('weatherBg'),
    particles: document.getElementById('particles'),
};

// Initialize Application
async function init() {
    setupEventListeners();
    await loadDefaultLocation();
    startTimeUpdate();
    createParticles();
    setupPeriodicUpdates();
}

// Event Listeners Setup
function setupEventListeners() {
    // Search
    elements.citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCity();
    });
    
    // Voice Search
    elements.voiceSearchBtn.addEventListener('click', startVoiceSearch);
    
    // Geolocation
    elements.geoLocateBtn.addEventListener('click', getCurrentLocation);
    
    // Unit Toggle
    elements.unitBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleUnits(btn.dataset.unit));
    });
    
    // Theme Toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Alert Close
    elements.closeAlert.addEventListener('click', () => {
        elements.alertBanner.classList.add('hidden');
    });
    
    // Retry
    elements.retryBtn.addEventListener('click', () => {
        searchCity();
    });
    
    // Radar Toggle
    elements.toggleRadar.addEventListener('click', toggleRadar);
}

// Feature 1: Severe Weather Alerts
function checkWeatherAlerts(data) {
    if (data.alerts && data.alerts.length > 0) {
        const alert = data.alerts[0];
        state.alerts = data.alerts;
        elements.alertMessage.textContent = `${alert.event}: ${alert.description}`;
        elements.alertBanner.classList.remove('hidden');
        
        // Send notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Weather Alert', {
                body: alert.description,
                icon: '/icons/icon-192.png'
            });
        }
    } else {
        elements.alertBanner.classList.add('hidden');
    }
}

// Request notification permission
if ('Notification' in window) {
    Notification.requestPermission();
}

// Feature 2: Hourly Forecast Carousel
function updateHourlyForecast(hourlyData) {
    elements.hourlyForecast.innerHTML = '';
    const next24Hours = hourlyData.slice(0, 8); // 3-hour intervals, 8 items = 24 hours
    
    next24Hours.forEach(hour => {
        const time = new Date(hour.dt * 1000);
        const temp = Math.round(hour.main.temp);
        const icon = hour.weather[0].icon;
        const precip = hour.pop ? Math.round(hour.pop * 100) : 0;
        
        const hourEl = document.createElement('div');
        hourEl.className = 'hourly-item fade-in';
        hourEl.innerHTML = `
            <div class="hourly-time">${time.getHours()}:00</div>
            <img class="hourly-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather">
            <div class="hourly-temp">${temp}°</div>
            ${precip > 0 ? `<div class="hourly-precip"><i class="fa-solid fa-droplet"></i>${precip}%</div>` : ''}
        `;
        
        elements.hourlyForecast.appendChild(hourEl);
    });
}

// Feature 3: Air Quality Index (AQI)
async function fetchAirQuality(lat, lon) {
    try {
        const response = await fetch(
            `${CONFIG.BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`
        );
        const data = await response.json();
        state.airQuality = data.list[0];
        updateAQIDisplay(state.airQuality);
    } catch (error) {
        console.error('AQI fetch failed:', error);
    }
}

function updateAQIDisplay(aqiData) {
    const aqi = aqiData.main.aqi;
    const components = aqiData.components;
    
    // AQI Levels: 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
    const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiClasses = ['good', 'fair', 'moderate', 'poor', 'very-poor'];
    
    elements.aqiValue.textContent = aqi;
    elements.aqiBadge.textContent = aqiLevels[aqi - 1];
    elements.aqiBadge.className = `aqi-badge ${aqiClasses[aqi - 1]}`;
    
    elements.pm25.textContent = `${components.pm2_5.toFixed(1)} µg/m³`;
    elements.pm10.textContent = `${components.pm10.toFixed(1)} µg/m³`;
    elements.o3.textContent = `${components.o3.toFixed(1)} µg/m³`;
}

// Feature 4: Clothing Recommendation
function getClothingRecommendation(temp, feelsLike, weather) {
    const tempC = temp;
    const conditions = weather.toLowerCase();
    
    let recommendation = '';
    let icon = 'fa-shirt';
    
    if (tempC < 0) {
        recommendation = 'Heavy winter coat, gloves, scarf, and warm boots';
        icon = 'fa-mitten';
    } else if (tempC < 5) {
        recommendation = 'Winter coat, warm layers, and gloves';
        icon = 'fa-coat';
    } else if (tempC < 10) {
        recommendation = 'Warm jacket or coat, long sleeves';
        icon = 'fa-jacket';
    } else if (tempC < 15) {
        recommendation = 'Light jacket, sweater, or hoodie';
        icon = 'fa-hoodie';
    } else if (tempC < 20) {
        recommendation = 'Long sleeves, light layers';
        icon = 'fa-shirt';
    } else if (tempC < 25) {
        recommendation = 'T-shirt, shorts or light pants';
        icon = 'fa-tshirt';
    } else {
        recommendation = 'Light, breathable clothing, hat, and sunglasses';
        icon = 'fa-sunglasses';
    }
    
    // Add weather-specific items
    if (conditions.includes('rain')) {
        recommendation += ', umbrella or raincoat';
        icon = 'fa-umbrella';
    } else if (conditions.includes('snow')) {
        recommendation += ', waterproof boots';
        icon = 'fa-boot';
    } else if (conditions.includes('wind')) {
        recommendation += ', windbreaker';
    }
    
    elements.clothingIcon.className = `fa-solid ${icon}`;
    elements.clothingRecommendation.textContent = recommendation;
}

// Feature 5: Rain Radar (Windy Embed)
function updateRadar(lat, lon, zoom = 8) {
    // Using Windy.com embed (free and reliable)
    const radarUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=100%&height=100%&zoom=${zoom}&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=%C2%B0C&radarRange=-1`;
    elements.radarFrame.src = radarUrl;
}

function toggleRadar() {
    elements.radarContainer.classList.toggle('collapsed');
    const icon = elements.toggleRadar.querySelector('i');
    icon.style.transform = elements.radarContainer.classList.contains('collapsed') 
        ? 'rotate(180deg)' 
        : 'rotate(0deg)';
}

// Feature 6: Dark Mode / Dynamic Backgrounds
function updateBackground(weatherMain, isDay) {
    const bgClass = getWeatherBgClass(weatherMain, isDay);
    elements.weatherBg.className = `weather-bg ${bgClass}`;
}

function getWeatherBgClass(weather, isDay) {
    const weatherLower = weather.toLowerCase();
    
    if (weatherLower.includes('clear')) return 'clear';
    if (weatherLower.includes('cloud')) return 'clouds';
    if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) return 'rain';
    if (weatherLower.includes('snow')) return 'snow';
    if (weatherLower.includes('thunderstorm')) return 'thunderstorm';
    if (weatherLower.includes('mist') || weatherLower.includes('fog')) return 'mist';
    
    return 'clear';
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', state.theme);
    
    const icon = elements.themeToggle.querySelector('i');
    icon.className = state.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    
    localStorage.setItem('theme', state.theme);
}

// Feature 7: PWA - Offline Support (manifest.json and sw.js provided separately)

// Feature 8: Sun Position / UV Index
function updateSunAndUV(data) {
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    const now = new Date();
    
    // Format times
    elements.sunriseTime.textContent = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    elements.sunsetTime.textContent = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Calculate sun progress
    const totalDaylight = sunset - sunrise;
    const elapsed = now - sunrise;
    const progress = Math.max(0, Math.min(100, (elapsed / totalDaylight) * 100));
    elements.sunProgress.style.width = `${progress}%`;
    
    // UV Index (if available)
    if (data.uvi !== undefined) {
        updateUVIndex(data.uvi);
    }
}

function updateUVIndex(uvi) {
    elements.uvIndex.textContent = uvi.toFixed(1);
    
    let label, recommendation, fillWidth;
    if (uvi < 3) {
        label = 'Low';
        recommendation = 'No protection needed';
        fillWidth = 20;
    } else if (uvi < 6) {
        label = 'Moderate';
        recommendation = 'Wear sunscreen';
        fillWidth = 40;
    } else if (uvi < 8) {
        label = 'High';
        recommendation = 'Use SPF 30+, seek shade';
        fillWidth = 60;
    } else if (uvi < 11) {
        label = 'Very High';
        recommendation = 'Avoid sun exposure';
        fillWidth = 80;
    } else {
        label = 'Extreme';
        recommendation = 'Stay indoors';
        fillWidth = 100;
    }
    
    elements.uvLabel.textContent = label;
    elements.uvRecommendation.textContent = recommendation;
    elements.uvFill.style.width = `${fillWidth}%`;
}

// Feature 9: Time Zone Corrected Time
function updateLocalTime(timezoneOffset) {
    const updateTime = () => {
        const now = new Date();
        const localTime = new Date(now.getTime() + (timezoneOffset * 1000) + (now.getTimezoneOffset() * 60000));
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        };
        
        elements.localTime.textContent = localTime.toLocaleString('en-US', options);
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Feature 10: Voice Search
function startVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        // Show listening toast
        elements.voiceToast.classList.remove('hidden');
        elements.voiceSearchBtn.classList.add('listening');
        
        recognition.start();
        
        recognition.onresult = (event) => {
            const city = event.results[0][0].transcript;
            elements.citySearch.value = city;
            searchCity();
        };
        
        recognition.onerror = () => {
            showError('Voice recognition failed');
        };
        
        recognition.onend = () => {
            elements.voiceToast.classList.add('hidden');
            elements.voiceSearchBtn.classList.remove('listening');
        };
    } else {
        alert('Voice search is not supported in your browser');
    }
}

// Core Weather Functions
async function searchCity() {
    const city = elements.citySearch.value.trim();
    if (!city) return;
    
    state.city = city;
    await fetchWeatherData(city);
}

async function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported');
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            showError('Unable to get location: ' + error.message);
        }
    );
}

async function fetchWeatherData(city) {
    showLoading();
    
    try {
        // Get coordinates first
        const geoResponse = await fetch(
            `${CONFIG.GEO_URL}/direct?q=${city}&limit=1&appid=${CONFIG.API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData.length) {
            throw new Error('City not found');
        }
        
        const { lat, lon, name, country } = geoData[0];
        state.city = name;
        state.country = country;
        
        await fetchWeatherByCoords(lat, lon);
    } catch (error) {
        showError(error.message);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        // Fetch all data in parallel
        const [weatherRes, forecastRes, uviRes] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=${state.units}&appid=${CONFIG.API_KEY}`)
        ]);
        
        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();
        const oneCallData = await uviRes.json();
        
        state.currentWeather = weatherData;
        state.forecast = forecastData;
        
        // Update all UI components
        updateCurrentWeather(weatherData);
        updateHourlyForecast(forecastData.list);
        updateDailyForecast(forecastData.list);
        updateSunAndUV({ ...weatherData, uvi: oneCallData.current.uvi });
        getClothingRecommendation(weatherData.main.temp, weatherData.main.feels_like, weatherData.weather[0].main);
        updateBackground(weatherData.weather[0].main, oneCallData.current.dt > weatherData.sys.sunrise);
        updateLocalTime(weatherData.timezone);
        updateRadar(lat, lon);
        checkWeatherAlerts(oneCallData);
        
        // Fetch AQI
        await fetchAirQuality(lat, lon);
        
        // Update chart
        updateForecastChart(forecastData.list);
        
        hideLoading();
        elements.weatherDashboard.classList.remove('hidden');
        
    } catch (error) {
        showError('Failed to fetch weather data: ' + error.message);
    }
}

function updateCurrentWeather(data) {
    elements.cityDisplay.textContent = data.name;
    elements.countryDisplay.textContent = data.sys.country;
    elements.currentTemp.textContent = Math.round(data.main.temp);
    elements.feelsLikeTemp.textContent = Math.round(data.main.feels_like);
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    elements.weatherMain.textContent = data.weather[0].main;
    elements.weatherDesc.textContent = data.weather[0].description;
    
    // Stats
    const windSpeed = state.units === 'metric' 
        ? `${Math.round(data.wind.speed * 3.6)} km/h` 
        : `${Math.round(data.wind.speed)} mph`;
    elements.windStat.textContent = windSpeed;
    elements.humidityStat.textContent = `${data.main.humidity}%`;
    elements.pressureStat.textContent = `${data.main.pressure} hPa`;
    elements.visibilityStat.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
}

function updateDailyForecast(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString();
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                date: date,
                temps: [],
                icons: [],
                descriptions: []
            };
        }
        
        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].icons.push(item.weather[0].icon);
        dailyData[dayKey].descriptions.push(item.weather[0].description);
    });
    
    const days = Object.values(dailyData).slice(0, 7);
    elements.dailyForecast.innerHTML = '';
    
    days.forEach(day => {
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        const icon = day.icons[Math.floor(day.icons.length / 2)];
        const desc = day.descriptions[0];
        
        const dayEl = document.createElement('div');
        dayEl.className = 'forecast-day fade-in';
        dayEl.innerHTML = `
            <span class="forecast-date">${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <img class="forecast-icon-small" src="https://openweathermap.org/img/wn/${icon}.png" alt="weather">
            <div class="forecast-temp-range">
                <span class="temp-max">${maxTemp}°</span>
                <span class="temp-min">${minTemp}°</span>
            </div>
            <span class="forecast-desc">${desc}</span>
        `;
        
        elements.dailyForecast.appendChild(dayEl);
    });
}

function updateForecastChart(forecastList) {
    const dailyTemps = {};
    
    forecastList.slice(0, 40).forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString();
        
        if (!dailyTemps[dayKey]) {
            dailyTemps[dayKey] = {
                max: -Infinity,
                min: Infinity,
                date: date
            };
        }
        
        dailyTemps[dayKey].max = Math.max(dailyTemps[dayKey].max, item.main.temp);
        dailyTemps[dayKey].min = Math.min(dailyTemps[dayKey].min, item.main.temp);
    });
    
    const days = Object.values(dailyTemps).slice(0, 7);
    
    if (state.chart) {
        state.chart.destroy();
    }
    
    state.chart = new Chart(elements.forecastChart, {
        type: 'line',
        data: {
            labels: days.map(d => d.date.toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [
                {
                    label: 'High',
                    data: days.map(d => Math.round(d.max)),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: 'Low',
                    data: days.map(d => Math.round(d.min)),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
                        font: { family: 'Plus Jakarta Sans', size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                        callback: (value) => `${value}°`
                    }
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                    }
                }
            }
        }
    });
}

function toggleUnits(unit) {
    const newUnit = unit === 'celsius' ? 'metric' : 'imperial';
    if (state.units === newUnit) return;
    
    state.units = newUnit;
    CONFIG.UNITS = newUnit;
    
    elements.unitBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });
    
    // Refresh data with new units
    if (state.currentWeather) {
        fetchWeatherByCoords(state.currentWeather.coord.lat, state.currentWeather.coord.lon);
    }
}

// UI State Management
function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.weatherDashboard.classList.add('hidden');
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
}

function showError(message) {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    elements.weatherDashboard.classList.add('hidden');
    elements.errorText.textContent = message;
}

// Background Particles
function createParticles() {
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        
        elements.particles.appendChild(particle);
    }
}

// Time Update
function startTimeUpdate() {
    setInterval(() => {
        if (state.currentWeather) {
            updateLocalTime(state.currentWeather.timezone);
        }
    }, 1000);
}

// Periodic Updates
function setupPeriodicUpdates() {
    setInterval(() => {
        if (state.currentWeather) {
            fetchWeatherByCoords(
                state.currentWeather.coord.lat,
                state.currentWeather.coord.lon
            );
        }
    }, CONFIG.UPDATE_INTERVAL);
}

// Load Default Location
async function loadDefaultLocation() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.body.setAttribute('data-theme', savedTheme);
        elements.themeToggle.querySelector('i').className = 
            savedTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
    
    await fetchWeatherData('London');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Favorite Cities Feature
const favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');

function addToFavorites(city) {
    if (!favorites.includes(city)) {
        favorites.push(city);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        showToast(`📍 ${city} added to favorites`);
        updateFavoritesList();
    }
}

function removeFromFavorites(city) {
    const index = favorites.indexOf(city);
    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        updateFavoritesList();
    }
}

function updateFavoritesList() {
    // Create dropdown in header
    const favContainer = document.createElement('div');
    favContainer.className = 'favorites-dropdown';
    // ... implementation
}

function showToast(message) {
    const toast = document.getElementById('voiceToast');
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

const mapLayers = {
    radar: 'radar',
    satellite: 'satellite',
    temperature: 'temp',
    wind: 'wind',
    precipitation: 'precipitation'
};

function changeRadarLayer(layer) {
    const lat = state.currentWeather?.coord?.lat || 51.5;
    const lon = state.currentWeather?.coord?.lon || -0.1;
    const url = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=8&overlay=${layer}`;
    elements.radarFrame.src = url;
}

async function fetchHistoricalData(lat, lon) {
    // OpenWeatherMap historical API (requires paid plan)
    // Alternative: Use localStorage to cache and show trends
    const history = JSON.parse(localStorage.getItem(`weather_${state.city}`) || '[]');
    history.push({
        temp: state.currentWeather.main.temp,
        time: new Date().toISOString()
    });
    
    // Keep last 7 days
    const weekData = history.slice(-168); // 168 hours = 7 days
    localStorage.setItem(`weather_${state.city}`, JSON.stringify(weekData));
}

const translations = {
    en: {
        feelsLike: 'Feels like',
        humidity: 'Humidity',
        wind: 'Wind',
        // ... more translations
    },
    es: {
        feelsLike: 'Sensación térmica',
        humidity: 'Humedad',
        wind: 'Viento',
        // ... more translations
    }
};

function setLanguage(lang) {
    state.language = lang;
    updateUIText();
    // Refetch weather with lang parameter
    fetchWeatherData(state.city);
}

// In sw.js
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.message,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: { url: data.url },
        actions: [
            { action: 'open', title: 'View Details' },
            { action: 'close', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'open') {
        clients.openWindow(event.notification.data.url);
    }
});

function compareWeather(city1, city2) {
    Promise.all([
        fetch(`${CONFIG.BASE_URL}/weather?q=${city1}&appid=${CONFIG.API_KEY}`),
        fetch(`${CONFIG.BASE_URL}/weather?q=${city2}&appid=${CONFIG.API_KEY}`)
    ]).then(([res1, res2]) => {
        // Create comparison modal
        showComparisonModal(res1, res2);
    });
}
