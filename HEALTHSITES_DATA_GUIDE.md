# Malawi Healthsites Data - Quick Reference Guide

## Overview
The original CSV file (`malawi pharmacy data - malawi healthsites.csv`) has been converted into LLM-ready JSON formats for easy integration with AI calls.

## Files Generated

### 1. **healthsites_llm.json** (46 KB) - RECOMMENDED FOR LLM CALLS
- Compact version optimized for LLM context
- Contains summary statistics and 50 sample facilities
- Best for: Direct LLM integration, minimal token usage
- **Location**: `/frontend/public/data/healthsites_llm.json`

### 2. **healthsites_processed.json** (274 KB) - FULL DATASET
- Complete dataset with all 303 facilities
- Structured JSON with all available fields
- Best for: Analysis, filtering, detailed queries
- **Location**: `/frontend/public/data/healthsites_processed.json`

## Data Structure

Each facility object contains:
```json
{
  "id": "unique-identifier",
  "name": "Facility Name",
  "type": "hospital|clinic|pharmacy|dentist|doctors",
  "location": {
    "latitude": -13.93951766,
    "longitude": 33.79101882,
    "city": "Lilongwe",
    "address": "Street Name",
    "postcode": "12345"
  },
  "details": {
    "operator": "Ministry of Health",
    "operator_type": "public|private|ngo",
    "operational_status": "operational",
    "opening_hours": "Mo-Fr 07:00-17:00",
    "beds": 50,
    "staff_doctors": 5,
    "staff_nurses": 15,
    "specialities": ["maternity", "dentist"]
  },
  "services": {
    "dispensing": "yes",
    "emergency": "yes",
    "wheelchair": "yes",
    "insurance": "yes"
  },
  "infrastructure": {
    "water_source": "borehole",
    "electricity": "grid"
  },
  "metadata": {
    "completeness": 31.25,
    "osm_id": "41796093",
    "last_updated": "2023-06-16T14:02:00+00:00"
  }
}
```

## Dataset Statistics

- **Total Facilities**: 303
- **Hospitals**: 199
- **Clinics**: 67
- **Pharmacies**: 27
- **Dentists**: 8
- **Doctors**: 2

### Data Quality
- **With Coordinates**: 152 (50%)
- **With Names**: 256 (84%)
- **With Operators**: 38 (13%)

## Using with LLM

### TypeScript/JavaScript Integration

```typescript
import {
  loadHealthsitesData,
  getFormattedFacilityContext,
  getFacilitiesByType
} from '@/app/utils/healthsitesData';

// Load data
const data = await loadHealthsitesData();

// Get formatted context for LLM
const context = await getFormattedFacilityContext();

// Filter by type
const clinics = await getFacilitiesByType('clinic');
```

### For Claude API Calls

Use the utilities in `healthsitesLLM.ts`:

```typescript
import {
  prepareHealthsitesContext,
  createHealthsitesAnalysisMessage,
  createClinicOptimizationPrompt
} from '@/app/utils/healthsitesLLM';

// Get context for system prompt
const context = await prepareHealthsitesContext();

// Create analysis message
const message = await createHealthsitesAnalysisMessage(
  'What healthcare gaps exist?'
);

// Create specialized optimization prompt
const prompt = await createClinicOptimizationPrompt();
```

### Manual API Usage

```bash
# Include in system prompt
"Here is healthcare facility data for Malawi: [content of healthsites_llm.json]"

# Or include in user message
"Analyze this healthcare network: [content of healthsites_llm.json]"
```

## Data Processing

The data was processed using `process_healthsites.py`:
- Cleaned missing values
- Normalized field formats
- Removed incomplete records (2 removed, 303 kept)
- Created summary statistics
- Generated LLM-optimized format

## Tips for LLM Integration

1. **For Context-Limited Models**: Use `healthsites_llm.json` (46 KB, ~11k tokens)
2. **For Full Analysis**: Use `healthsites_processed.json` with filtering
3. **For Specific Tasks**: Use utility functions that filter by type, location, or quality
4. **For CSV Format**: Use `getFacilitiesAsCSV()` from `healthsitesLLM.ts`
5. **For Minimal Size**: Use `getMinimalFacilitiesJSON()` for token efficiency

## Example LLM Prompts

### Network Analysis
```
Using the attached Malawi healthcare facility data, analyze:
1. Geographic coverage gaps
2. Facility type distribution
3. Resource concentration
4. Recommendations for improvement
```

### Clinic Optimization
```
Based on the healthcare facilities data, which clinics are in underserved areas?
Suggest optimization strategies for resource allocation.
```

### Capacity Planning
```
Analyze the beds, doctors, and nurses distribution across facilities.
Identify areas needing capacity expansion.
```

## File Locations

| File | Size | Purpose |
|------|------|---------|
| `healthsites_llm.json` | 46 KB | LLM-optimized format |
| `healthsites_processed.json` | 274 KB | Full dataset |
| `malawi pharmacy data - malawi healthsites.csv` | Original | Source CSV |
| `process_healthsites.py` | Script | Data processing (Python) |

## Next Steps

1. ✅ Data converted to JSON
2. ✅ TypeScript utilities created
3. ✅ LLM integration utilities ready
4. 📋 Ready to use in API calls

Use `healthsitesData.ts` and `healthsitesLLM.ts` in your application for seamless integration!
