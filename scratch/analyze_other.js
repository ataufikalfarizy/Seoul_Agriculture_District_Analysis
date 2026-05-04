const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./Seoul_Agriculture_District_geojson/Seoul_Agriculture_District.geojson', 'utf8'));

let noShopOrAmenity = 0;
const otherProps = {};

data.features.forEach(f => {
    const props = f.properties;
    if (!props.shop && !props.amenity) {
        noShopOrAmenity++;
        Object.keys(props).forEach(k => {
            if (props[k] !== null) {
                otherProps[k] = (otherProps[k] || 0) + 1;
            }
        });
    }
});

console.log('Features without shop/amenity:', noShopOrAmenity);
console.log('Properties present in those features:', otherProps);
