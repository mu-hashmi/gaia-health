# Data Files

This directory contains source data files for the application.

## OSM Data (OpenStreetMap)

The `malawi-251108.osm.pbf` file contains OpenStreetMap data for Malawi and is used to extract village/settlement information.

**File Size:** ~137MB (too large for GitHub)

**How to obtain:**
1. Download from Geofabrik: https://download.geofabrik.de/africa/malawi.html
2. Or use the direct link: https://download.geofabrik.de/africa/malawi-latest.osm.pbf
3. Place the file in this directory (`frontend/app/data/`)

**Note:** This file is gitignored and should not be committed to the repository. The preprocessing script (`scripts/preprocess-data.ts`) will process this file and extract village data into `public/data/villages.json`, which is committed to the repository.

## Other Data Files

- **GAIA Clinic Stops**: `GAIA MHC Clinic Stops GPS.xlsx - Clinic stops GPS.csv`
- **MHFR Facilities**: `MHFR_Facilities.xlsx - Facilities.csv`
- **District Boundaries**: `Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).csv` and `.geojson`
- **Population Data**: `mwi_ppp_2020_UNadj_constrained.tif` (GeoTIFF raster file)

All processed data is output to `public/data/` directory.

