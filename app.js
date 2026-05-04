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
    'Retail': '#ef4444',     // Red
    'Amenities': '#3b82f6',  // Blue
    'Land Use': '#10b981',   // Green
    'Other': '#f59e0b'       // Orange
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

// New DOM Elements for UI Refinement
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const mobileDragHandle = document.getElementById('mobileDragHandle');
const sidebarHeader = document.getElementById('sidebarHeader');
const sidebarTitleContainer = document.getElementById('sidebarTitleContainer');
const mapRecenterBtn = document.getElementById('mapRecenterBtn');
const recenterBtnContainer = document.getElementById('recenterBtnContainer');
const sidebarChevronIcon = document.getElementById('sidebarChevronIcon');

// UI State
let isSidebarCollapsed = false;

// --- Initialization ---
async function init() {
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

    // 3. Fetch Data
    try {
        const response = await fetch('./Seoul_Agriculture_District_geojson/Seoul_Agriculture_District.geojson');
        const data = await response.json();
        allFeatures = processFeatures(data.features);
    } catch (error) {
        console.error("Error loading geojson data:", error);
        allFeatures = [];
    }

    // 4. Initialize Marker Cluster
    markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 17
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

// --- Data Processing ---
function processFeatures(features) {
    let idCounter = 0;
    return features.map(f => {
        let category = 'Other';
        const props = f.properties;

        if (props.shop) {
            category = 'Retail';
        } else if (props.amenity) {
            category = 'Amenities';
        } else if (props.landuse) {
            category = 'Land Use';
        }

        return {
            type: 'Feature',
            properties: {
                id: props.osm_id || idCounter++,
                name: props.name || props.shop || props.amenity || props.landuse || 'Unknown',
                category: category,
                originalProps: props,
                score: Math.floor(Math.random() * 100) // keeping mock score for demo UI
            },
            geometry: f.geometry
        };
    });
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
        style: function (feature) {
            if (feature.geometry.type !== 'Point' && feature.geometry.type !== 'MultiPoint') {
                return {
                    color: '#94a3b8', // Light slate for polygons
                    weight: 1.5,
                    dashArray: '4, 4',
                    fillColor: '#94a3b8',
                    fillOpacity: 0.1
                };
            }
        },
        onEachFeature: function (feature, layer) {
            bindPopupContent(feature, layer);

            // Interaction: Proximity Analysis
            layer.on('click', function (e) {
                // If polygon, use click event latlng, if point use layer latlng
                const centerCoord = feature.geometry.type === 'Point' ? latlngToCoords(layer.getLatLng()) : latlngToCoords(e.latlng);
                analyzeProximity(feature, centerCoord);
            });
        }
    });

    markerCluster.addLayer(geoJsonLayer);

    // Update Stats
    visibleCountEl.innerText = filteredFeatures.length;
}

function createCustomMarker(feature, latlng) {
    const color = categoryColors[feature.properties.category];

    // Using circleMarker for efficient data rendering on large datasets
    return L.circleMarker(latlng, {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
    });
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
        color: '#94a3b8', // Consistent with polygon styling
        fillColor: '#94a3b8',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '4, 4'
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
                // Add highlight pulse animation style for circleMarker
                activeHighlights.push({ layer: layer, originalStyle: { ...layer.options } });
                layer.setStyle({
                    color: '#3b82f6',
                    weight: 3,
                    radius: 8,
                    fillOpacity: 1
                });
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
        item.layer.setStyle(item.originalStyle);
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

function checkMapCenter() {
    const currentCenter = map.getCenter();
    const seoulCenter = L.latLng(SEOUL_COORDS);
    const dist = currentCenter.distanceTo(seoulCenter);
    
    // Show Recenter button if distance > 3000m or zoom differs significantly
    if (dist > 3000 || Math.abs(map.getZoom() - DEFAULT_ZOOM) > 1) {
        recenterBtnContainer.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        recenterBtnContainer.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
    } else {
        recenterBtnContainer.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
        recenterBtnContainer.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
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

    const resetMap = () => {
        map.flyTo(SEOUL_COORDS, DEFAULT_ZOOM, { duration: 1 });
        map.closePopup();
        clearHighlight();
    };

    resetViewBtn.addEventListener('click', resetMap);
    mapRecenterBtn.addEventListener('click', resetMap);

    map.on('moveend', checkMapCenter);

    // Clear highlight when popup is closed manually
    map.on('popupclose', function () {
        // Give it a tiny delay to prevent clearing if another popup is immediately opened
        setTimeout(clearHighlight, 100);
    });

    // Sidebar Toggle Logic
    const toggleSidebar = () => {
        isSidebarCollapsed = !isSidebarCollapsed;
        
        if (isSidebarCollapsed) {
            // Desktop Collapse
            sidebar.classList.add('sm:-translate-x-full');
            // Move toggle button outside
            sidebarToggleBtn.classList.add('sm:absolute', 'sm:-right-[3.5rem]', 'sm:top-4', 'sm:bg-white', 'dark:sm:bg-gray-800', 'sm:shadow-xl', 'sm:border', 'sm:border-gray-200', 'dark:sm:border-gray-700', 'sm:rounded-xl', 'sm:p-3');
            
            // Mobile Collapse
            sidebar.classList.add('translate-y-[calc(100%-4.5rem)]');
            sidebar.classList.remove('translate-y-0');
            
            sidebarTitleContainer.classList.add('opacity-0', 'sm:opacity-100'); // Keep visible for desktop if needed, actually hide on mobile only? No, hide on both visually except icon.
            
            sidebarChevronIcon.setAttribute('data-lucide', 'menu');
            lucide.createIcons();
            
        } else {
            // Desktop Expand
            sidebar.classList.remove('sm:-translate-x-full');
            sidebarToggleBtn.classList.remove('sm:absolute', 'sm:-right-[3.5rem]', 'sm:top-4', 'sm:bg-white', 'dark:sm:bg-gray-800', 'sm:shadow-xl', 'sm:border', 'sm:border-gray-200', 'dark:sm:border-gray-700', 'sm:rounded-xl', 'sm:p-3');
            
            // Mobile Expand
            sidebar.classList.remove('translate-y-[calc(100%-4.5rem)]');
            sidebar.classList.add('translate-y-0');
            
            sidebarTitleContainer.classList.remove('opacity-0');
            
            sidebarChevronIcon.setAttribute('data-lucide', 'x');
            lucide.createIcons();
        }
    };

    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if(mobileDragHandle) mobileDragHandle.addEventListener('click', toggleSidebar);
    if(sidebarHeader) sidebarHeader.addEventListener('click', (e) => {
        // Only toggle on mobile if clicking header
        if(window.innerWidth < 640 && e.target !== themeToggleBtn && !themeToggleBtn.contains(e.target)) {
            toggleSidebar();
        }
    });

    // Initialize Sidebar State (Mobile collapsed by default, Desktop expanded)
    if(window.innerWidth < 640) {
        isSidebarCollapsed = true;
        sidebarChevronIcon.setAttribute('data-lucide', 'menu');
        sidebarTitleContainer.classList.add('opacity-0');
    } else {
        isSidebarCollapsed = false;
        sidebarChevronIcon.setAttribute('data-lucide', 'x');
    }
    lucide.createIcons();
}

// Run app
document.addEventListener('DOMContentLoaded', init);
