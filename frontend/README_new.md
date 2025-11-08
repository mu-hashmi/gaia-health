# GAIA Health - Healthcare Access Visualization

A data-driven resource allocation tool for equitable healthcare in Malawi. This application visualizes healthcare access gaps and helps optimize clinic placement to maximize population coverage.

## Features

- **Interactive Map**: Visualize all healthcare facilities (GAIA, Government, and CHAM clinics) with 5km coverage radius circles
- **Coverage Statistics**: Real-time calculation of population coverage when clinics are added or removed
- **Site Management**: Add new clinics by clicking on the map, or remove existing clinics
- **Impact Visualization**: See how many people gain or lose coverage when making changes

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How to Use

1. **View Existing Clinics**: The map shows all current clinics with color-coded markers:
   - 🟢 Green: GAIA Mobile Clinics
   - 🔵 Blue: Government Clinics
   - 🟣 Purple: CHAM Clinics

2. **Add a Clinic**: Click anywhere on the map to open a dialog where you can add a new clinic with a name and type.

3. **Remove a Clinic**: Click the "Remove" button next to any clinic in the sidebar list.

4. **View Coverage Impact**: The coverage statistics panel updates automatically, showing:
   - Total population
   - Covered population (within 5km of any clinic)
   - Uncovered population
   - Coverage percentage
   - Change indicators when clinics are added/removed

## Technical Details

- Built with Next.js 16 and React 19
- Uses Leaflet for interactive mapping
- Coverage calculation based on 5km radius (Haversine distance formula)
- Mock population data for demonstration purposes

## Project Structure

```
app/
  components/     # React components (Map, CoverageStats, etc.)
  data/          # Mock data files
  utils/         # Utility functions (coverage calculations)
  types.ts       # TypeScript type definitions
  page.tsx       # Main application page
```

## Notes for Demo

- Currently uses mock data for clinics and population
- Coverage radius is set to 5km (as per problem statement)
- Population points are randomly generated for demonstration
- In production, this would integrate with real GAIA clinic data and HDX population density datasets
