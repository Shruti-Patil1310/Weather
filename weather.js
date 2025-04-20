let textfield = document.getElementById("city");
let AQIFrontView = document.getElementById("AQI");
let WQIFrontView = document.getElementById("WQI");
let SQIFrontView = document.getElementById("SQI");
let container = document.querySelector("#weather");
let container2 = document.querySelector("#karjat-details");
let qualityContainer = document.getElementById("quality-container");
let getWeatherBtn = document.getElementById("getWeatherBtn");

let cityData = {}; // Unified data object

window.onload = function () {
  initializePage("karjat");

  // Get current page URL
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Activate matching link
  document.querySelectorAll(".nav-link").forEach((link) => {
    const linkPage = link.getAttribute("href").split("/").pop();

    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });

  function handleWeatherBtnClick(event) {
    event.preventDefault();
    const cityInput = document.getElementById("city");
    let city = cityInput.value.trim();

    if (!city) {
      city = "Karjat";
    }
    initializePage(city);
  }

  if (getWeatherBtn) {
    getWeatherBtn.addEventListener("click", handleWeatherBtnClick);
  } else {
    console.error("getWeatherBtn element not found");
  }

  textfield.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleWeatherBtnClick(event);
    }
  });
};

async function initializePage(city) {
  await fetchAllCityData(city);
  displayWeatherPage();
  displayAQIWQIInfront();
  displayAirWaterSoilQuality();
}

async function fetchAllCityData(city) {
  try {
    // Fetch weather data
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=6ed570ac911dad2a255e2965a53ced74&units=metric`
    );
    const weather = weatherRes.ok ? await weatherRes.json() : null;

    // Fetch air quality data
    const airRes = await fetch(
      `https://api.weatherbit.io/v2.0/current/airquality?city=${city}&key=bc5c2e9a675441e59d93ab9525554ebd`
    );
    const airData = airRes.ok ? await airRes.json() : null;
    const aqi = airData?.data?.[0]?.aqi || null;
    const airStatus = getAQIStatus(aqi);

    // Fetch geocoding for water/soil
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=6ed570ac911dad2a255e2965a53ced74`
    );
    const geoData = geoRes.ok ? await geoRes.json() : [];
    const { lat, lon } = geoData[0] || {};

    // Fetch water quality
    let moisture = null;
    let waterStatus = null;
    if (lat && lon) {
      const waterRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_moisture_0_to_1cm&timezone=auto`
      );
      const waterData = waterRes.ok ? await waterRes.json() : {};
      const moistureData = waterData.hourly?.soil_moisture_0_to_1cm || [];
      const latestWaterIndex = moistureData.length - 1;
      moisture = moistureData?.[latestWaterIndex]
        ? (moistureData[latestWaterIndex] * 100).toFixed(2)
        : 0;
      waterStatus = getWaterQualityStatus(moisture);
    }

    // Fetch soil quality
    let soilMoisture0to1 = null;
    let soilStatus = null;
    if (lat && lon) {
      const soilRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm&timezone=auto`
      );
      const soilData = soilRes.ok ? await soilRes.json() : {};
      const sm1 = soilData.hourly?.soil_moisture_0_to_1cm || [];
      const latestSoilIndex = sm1.length - 1;
      soilMoisture0to1 = sm1?.[latestSoilIndex]
        ? (sm1[latestSoilIndex] * 100).toFixed(2)
        : 0;
      soilStatus = getSoilQualityStatus(soilMoisture0to1);
    }

    // Store all data in one object
    cityData = {
      weather,
      aqi,
      airStatus,
      moisture,
      waterStatus,
      soilMoisture0to1,
      soilStatus,
    };
  } catch (error) {
    console.error("Fetching city data failed:", error);
    cityData = { error: error.message }; // Store error message
  }
}

function displayWeatherPage() {
  if (!container2) {
    console.error("container2 element not found");
    return;
  }
  if (!cityData.weather) {
    container2.innerHTML = `<p>Weather data not available.</p>`;
    return;
  }

  let { name, main, wind } = cityData.weather;
  container2.innerHTML = `
    <h4>${name}</h4>
    <div class="data-details">
      <span><h4>${main.temp}°C</h4></span>
      <div>
        <span><h4>${main.humidity}</h4></span>
        <span class="humidity"><img src="../Images/humidity.svg" alt="humidity"></span>     
      </div>
      <div>
        <span><h4>${main.pressure}</h4></span>
        <span><img src="../Images/meter.svg" width="5em" alt="humidity"></span>
      </div>
      <div>
        <span><h4>${wind.speed}</h4></span>
        <span><img src="../Images/wind-icon.svg" width="10em" alt="humidity"></span>
      </div>
    </div>
  `;

  if (!qualityContainer) {
    console.error("qualityContainer element not found");
    return;
  }
  qualityContainer.innerHTML = `<h4>${name}</h4>
    <div class="data-details">
    <span><h4>${main.temp}°C</h4></span>
    <div>
    <span><h4>${main.humidity}</h4></span>
    <span class="humidity"><img src="../Images/humidity.svg" alt="humidity"></span>     
    </div>
    <div>
      <span><h4>${main.pressure}</h4></span>
      <span><img src="../Images/meter.svg" width="5em" alt="humidity"></span>
    </div>
    <div>
      <span><h4>${wind.speed}</h4></span>
      <span><img src="../Images/wind-icon.svg" width="10em" alt="humidity"></span>
    </div>
    </div>
    `;
}

function displayAQIWQIInfront() {
  if (!AQIFrontView || !WQIFrontView) {
    console.error("AQIFrontView or WQIFrontView element not found");
    return;
  }

  AQIFrontView.innerHTML = `
    <h4>AQI</h4>
    <h1>${cityData.aqi || "N/A"}</h4>
    <h1>${cityData.airStatus?.level || "N/A"}</h1>
    <p>${cityData.airStatus?.advice || "No advice available."}</p>
  `;

  WQIFrontView.innerHTML = `
    <h4>WQI</h4>
    <h1>${cityData.moisture || "N/A"}</h4>
    <h1>${cityData.waterStatus?.level || "N/A"}</h1>
    <p>${cityData.waterStatus?.advice || "No advice available."}</p>
  `;
  SQIFrontView.innerHTML = `
  <h4>SQI</h4>
    <h1>${cityData.soilMoisture0to1 || "N/A"}</h4>
    <h1>${cityData.soilStatus?.level || "N/A"}</h1>
    <p>${cityData.soilStatus?.advice || "No advice available."}</p>
  `;
}

function displayAirWaterSoilQuality() {
  if (!qualityContainer) {
    console.error("qualityContainer element not found");
    return;
  }
  console.log(cityData);

  qualityContainer.innerHTML = `
    <h4>${cityData.weather.name}</h4>
    <div class="data-details">
    <span><h4>${cityData.weather.main.temp}°C</h4></span>
    <div>
    <span><h4 class="color">${cityData.weather.main.humidity}</h4></span>
    <span class="humidity color"><img src="../Images/icons/humidity.svg" alt="humidity"></span>     
    </div>
    <div>
      <span><h4 class="color">${cityData.weather.main.pressure}</h4></span>
      <span><img class="color" src="../Images/icons/meter.svg" width="5em" alt="humidity"></span>
    </div>
    <div>
      <span><h4 class="color">${cityData.weather.wind.speed}</h4></span>
      <span><img class="color" src="../Images/icons/wind-icon.svg" width="10em" alt="humidity"></span>
    </div>
    </div>
  
  `;
}

function getAQIStatus(aqi) {
  if (aqi === null) {
    return {
      level: "N/A",
      color: "#eee",
      icon: "",
      advice: "Data not available",
    };
  }
  if (aqi <= 50)
    return {
      level: "Good",
      color: "#13b718",
      icon: "🌿",
      advice: "Air quality is satisfactory",
    };
  if (aqi <= 100)
    return {
      level: "Moderate",
      color: "#dfca0f",
      icon: "😷",
      advice: "Sensitive people should reduce outdoor exertion",
    };
  if (aqi <= 150)
    return {
      level: "Unhealthy for Sensitive Groups",
      color: "#e08d0f",
      icon: "⚠️",
      advice: "Limit outdoor activities",
    };
  if (aqi <= 200)
    return {
      level: "Unhealthy",
      color: "#bb3127",
      icon: "🚫",
      advice: "Health effects may occur",
    };
  if (aqi <= 300)
    return {
      level: "Very Unhealthy",
      color: "#900fa6",
      icon: "☣️",
      advice: "Emergency health warnings",
    };
  return {
    level: "Hazardous",
    color: "#7d4dcfe8",
    icon: "☠️",
    advice: "Serious health effects for everyone",
  };
}

function getWaterQualityStatus(moisture) {
  if (moisture === null) {
    return {
      level: "N/A",
      color: "#eee",
      icon: "",
      advice: "Data not available",
    };
  }
  if (moisture >= 70)
    return {
      level: "Good",
      color: "#13b718",
      icon: "💧",
      advice: "Water quality is excellent for usage",
    };
  if (moisture >= 50)
    return {
      level: "Moderate",
      color: "#dfca0f",
      icon: "⚠️",
      advice: "Water quality is acceptable but monitor usage",
    };
  return {
    level: "Poor",
    color: "#bb3127",
    icon: "🚱",
    advice: "Water quality is not suitable for usage",
  };
}
function getSoilQualityStatus(moisture) {
  if (moisture === null) {
    return {
      level: "N/A",
      color: "#eee",
      icon: "",
      advice: "Data not available",
    };
  }
  if (moisture >= 70)
    return {
      level: "Good",
      color: "#13b718",
      icon: "🌱",
      advice: "Soil moisture is optimal for plant growth",
    };
  if (moisture >= 50)
    return {
      level: "Moderate",
      color: "#dfca0f",
      icon: "⚠️",
      advice: "Soil moisture is adequate, monitor plant health",
    };
  return {
    level: "Poor",
    color: "#bb3127",
    icon: "🏜️",
    advice: "Soil is dry; irrigation may be needed",
  };
}
function displayAQIPage(data){
  

}
