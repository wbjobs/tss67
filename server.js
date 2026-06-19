const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8088;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let geojsonData;
try {
  const dataPath = path.join(__dirname, 'data', 'china-provinces.json');
  geojsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  console.error('Failed to load GeoJSON data:', err);
  geojsonData = { type: 'FeatureCollection', features: [] };
}

app.get('/api/geojson', (req, res) => {
  res.json(geojsonData);
});

app.get('/api/expansion', (req, res) => {
  const factor = parseFloat(req.query.factor) || 0;
  const clampedFactor = Math.max(0, Math.min(100, factor));
  
  const expansions = {};
  const densities = geojsonData.features.map(f => Number(f.properties.density) || 0);
  const maxDensity = Math.max(...densities);
  const minDensity = Math.min(...densities);
  const densityRange = maxDensity - minDensity;
  
  geojsonData.features.forEach(feature => {
    const density = Number(feature.properties.density) || 0;
    let normalizedDensity = 0;
    
    if (densityRange > 0 && isFinite(densityRange)) {
      normalizedDensity = (density - minDensity) / densityRange;
    }
    
    normalizedDensity = Math.max(0, Math.min(1, normalizedDensity));
    
    const expansionCoefficient = 1 + (normalizedDensity * clampedFactor / 100) * 0.8;
    
    const safeExpansion = isFinite(expansionCoefficient) ? expansionCoefficient : 1;
    
    expansions[feature.properties.name] = {
      expansion: safeExpansion,
      density: density,
      normalizedDensity: normalizedDensity
    };
  });
  
  res.json({
    factor: clampedFactor,
    expansions: expansions
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
