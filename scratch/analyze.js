const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./Seoul_Agriculture_District_geojson/Seoul_Agriculture_District.geojson', 'utf8'));

const shops = {};
const amenities = {};

data.features.forEach(f => {
    const props = f.properties;
    if (props.shop) {
        shops[props.shop] = (shops[props.shop] || 0) + 1;
    }
    if (props.amenity) {
        amenities[props.amenity] = (amenities[props.amenity] || 0) + 1;
    }
});

console.log('Shops:', Object.entries(shops).sort((a, b) => b[1] - a[1]).slice(0, 20));
console.log('Amenities:', Object.entries(amenities).sort((a, b) => b[1] - a[1]).slice(0, 20));
console.log('Total features:', data.features.length);
