// Initialize Lucide Icons
lucide.createIcons();

// --- Configuration & State ---
const SEOUL_COORDS = [37.5665, 126.9780];
const DEFAULT_ZOOM = 12;
const RADIUS_METERS = 500;

// Theme configuration
const tileLayers = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const categoryColors = {
    'Manufacturing': '#ef4444', // Red
    'Tech': '#3b82f6',          // Blue
    'Logistics': '#10b981'      // Green
};

// Global State
let map;
let currentTileLayer;
let markerCluster;
let allFeatures = []; // Store raw GeoJSON features
let activeCircle = null; // Turf.js buffer visualization
let activeHighlights = []; // Highlighted markers

// DOM Elements
const themeToggleBtn = document.getElementById('themeToggle');
const htmlElement = document.documentElement;
const filterCheckboxes = document.querySelectorAll('.category-filter');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const visibleCountEl = document.getElementById('visibleCount');
const nearbyCountContainer = document.getElementById('nearbyCountContainer');
const nearbyCountEl = document.getElementById('nearbyCount');
const activeRadiusContainer = document.getElementById('activeRadiusContainer');

// --- Initialization ---
function init() {
    // 1. Initialize Map
    map = L.map('map', {
        center: SEOUL_COORDS,
        zoom: DEFAULT_ZOOM,
        zoomControl: false // Move zoom control
    });

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // 2. Set Initial Theme
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
        htmlElement.classList.add('dark');
    }

    updateMapTiles();

    // 3. Generate Mock Data
    allFeatures = generateMockData(800);

    // 4. Initialize Marker Cluster
    markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    map.addLayer(markerCluster);

    // 5. Render Data
    renderMarkers();

    // 6. Setup Event Listeners
    setupEventListeners();
}

// --- Map & Theme Logic ---
function updateMapTiles() {
    const isDark = htmlElement.classList.contains('dark');
    const url = isDark ? tileLayers.dark : tileLayers.light;

    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    currentTileLayer = L.tileLayer(url, {
        attribution: tileAttribution,
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}

function toggleTheme() {
    htmlElement.classList.toggle('dark');
    updateMapTiles();

    // Also re-render popups if they are open to apply new theme styles? 
    // Leaflet popup class takes care of it via CSS variable override, no JS needed.
}

// --- Data Generation ---
// Generate random points around Seoul
function generateMockData(count) {
    const features = [];
    const categories = ['Manufacturing', 'Tech', 'Logistics'];

    // Seoul rough bounding box
    const bounds = {
        n: 37.65,
        s: 37.45,
        e: 127.15,
        w: 126.80
    };

    const prefixes = ['Seoul', 'Global', 'Smart', 'Future', 'Korea', 'Metro', 'Prime', 'Apex'];
    const suffixes = ['Corp', 'Inc', 'Solutions', 'Systems', 'Industries', 'Hub', 'Group'];

    for (let i = 0; i < count; i++) {
        const lat = bounds.s + Math.random() * (bounds.n - bounds.s);
        const lng = bounds.w + Math.random() * (bounds.e - bounds.w);
        const category = categories[Math.floor(Math.random() * categories.length)];

        const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${category} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;

        features.push({
            type: 'Feature',
            properties: {
                id: i,
                name: name,
                category: category,
                score: Math.floor(Math.random() * 100)
            },
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        });
    }

    return features;
}

// --- Rendering Logic ---
function renderMarkers() {
    markerCluster.clearLayers();
    clearHighlight();

    // Get active categories
    const activeCategories = Array.from(filterCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Filter features
    const filteredFeatures = allFeatures.filter(f => activeCategories.includes(f.properties.category));

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(filteredFeatures, {
        pointToLayer: function (feature, latlng) {
            return createCustomMarker(feature, latlng);
        },
        onEachFeature: function (feature, layer) {
            bindPopupContent(feature, layer);

            // Interaction: Proximity Analysis
            layer.on('click', function (e) {
                analyzeProximity(feature, latlngToCoords(e.latlng));
            });
        }
    });

    markerCluster.addLayer(geoJsonLayer);

    // Update Stats
    visibleCountEl.innerText = filteredFeatures.length;
}

function createCustomMarker(feature, latlng) {
    const color = categoryColors[feature.properties.category];

    const markerHtml = `
        <div style="
            background-color: ${color};
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
        "></div>
    `;

    const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    return L.marker(latlng, { icon: icon });
}

function bindPopupContent(feature, layer) {
    const props = feature.properties;
    const color = categoryColors[props.category];

    const popupContent = `
        <div class="p-1 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${color};"></div>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${props.category}</span>
            </div>
            <h3 class="font-bold text-lg mb-1 leading-tight text-gray-800 dark:text-gray-100">${props.name}</h3>
            <div class="mt-3 flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <span class="text-xs text-gray-500 dark:text-gray-400">Proximity Score</span>
                <span class="font-bold text-blue-600 dark:text-blue-400">${props.score}/100</span>
            </div>
            <button class="mt-3 w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 py-1.5 rounded-md transition-colors" onclick="zoomToFeature(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]})">
                Zoom in
            </button>
        </div>
    `;

    layer.bindPopup(popupContent, {
        closeButton: true,
        minWidth: 220
    });
}

// --- Turf.js Proximity Analysis ---
function analyzeProximity(centerFeature, centerCoords) {
    clearHighlight();

    // 1. Draw 500m Buffer
    activeCircle = L.circle(centerCoords, {
        radius: RADIUS_METERS,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '5, 5'
    }).addTo(map);

    // 2. Use Turf.js to find points within buffer
    // Convert center to Turf Point
    const centerPt = turf.point([centerCoords.lng, centerCoords.lat]);

    // Create Turf FeatureCollection from currently visible points
    const activeCategories = Array.from(filterCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const visibleFeatures = allFeatures.filter(f => activeCategories.includes(f.properties.category));
    const collection = turf.featureCollection(visibleFeatures);

    // Create a 500m buffer polygon using Turf
    const buffer = turf.buffer(centerPt, RADIUS_METERS / 1000, { units: 'kilometers' });

    // Find points within the polygon
    const pointsWithin = turf.pointsWithinPolygon(collection, buffer);

    const nearbyFeatures = pointsWithin.features;

    // 3. Highlight neighbors
    // Find markers in cluster and highlight them
    markerCluster.eachLayer(function (layer) {
        if (layer.feature) {
            const isNearby = nearbyFeatures.some(f => f.properties.id === layer.feature.properties.id);
            if (isNearby && layer.feature.properties.id !== centerFeature.properties.id) {

                // Add highlight pulse animation class
                const el = layer.getElement();
                if (el && el.firstElementChild) {
                    el.firstElementChild.style.boxShadow = `0 0 0 4px rgba(59, 130, 246, 0.4)`;
                    el.firstElementChild.style.transform = 'scale(1.2)';
                    activeHighlights.push({ layer: layer, originalStyle: el.firstElementChild.style.cssText });
                }
            }
        }
    });

    // 4. Update UI Stats
    nearbyCountEl.innerText = nearbyFeatures.length - 1; // Exclude center
    activeRadiusContainer.classList.remove('hidden');
    nearbyCountContainer.classList.remove('hidden');

    // Pan slightly to ensure popup and circle are visible
    map.panTo(centerCoords);
}

function clearHighlight() {
    if (activeCircle) {
        map.removeLayer(activeCircle);
        activeCircle = null;
    }

    activeHighlights.forEach(item => {
        const el = item.layer.getElement();
        if (el && el.firstElementChild) {
            el.firstElementChild.style.boxShadow = '0 0 4px rgba(0,0,0,0.4)';
            el.firstElementChild.style.transform = 'scale(1)';
        }
    });
    activeHighlights = [];

    activeRadiusContainer.classList.add('hidden');
    nearbyCountContainer.classList.add('hidden');
}

// --- Utilities & Events ---
function latlngToCoords(latlng) {
    return { lat: latlng.lat, lng: latlng.lng };
}

window.zoomToFeature = function (lat, lng) {
    map.flyTo([lat, lng], 16, {
        duration: 1.5
    });
};

function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return;

    // Simple search in allFeatures
    const result = allFeatures.find(f => f.properties.name.toLowerCase().includes(query));

    if (result) {
        const lat = result.geometry.coordinates[1];
        const lng = result.geometry.coordinates[0];

        map.flyTo([lat, lng], 16, { duration: 1.5 });

        // Find layer and open popup
        setTimeout(() => {
            markerCluster.eachLayer(function (layer) {
                if (layer.feature && layer.feature.properties.id === result.properties.id) {
                    markerCluster.zoomToShowLayer(layer, function () {
                        layer.openPopup();
                    });
                }
            });
        }, 1500);
    } else {
        // Fallback: simple geocoding attempt or shake animation
        searchInput.classList.add('border-red-500');
        setTimeout(() => searchInput.classList.remove('border-red-500'), 1000);
    }
}

function setupEventListeners() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    filterCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            renderMarkers();
        });
    });

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    resetViewBtn.addEventListener('click', () => {
        map.flyTo(SEOUL_COORDS, DEFAULT_ZOOM, { duration: 1 });
        map.closePopup();
        clearHighlight();
    });

    // Clear highlight when popup is closed manually
    map.on('popupclose', function () {
        // Give it a tiny delay to prevent clearing if another popup is immediately opened
        setTimeout(clearHighlight, 100);
    });
}

// Run app
document.addEventListener('DOMContentLoaded', init);
