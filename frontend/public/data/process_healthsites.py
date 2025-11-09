#!/usr/bin/env python3
"""
Process Malawi health sites CSV data for LLM consumption
Converts raw healthsites data to clean, structured JSON format
"""

import pandas as pd
import json
from pathlib import Path

# Load the CSV
csv_path = Path(__file__).parent / "malawi pharmacy data - malawi healthsites.csv"
df = pd.read_csv(csv_path)

print(f"Loaded {len(df)} records from CSV")
print(f"Columns: {list(df.columns)}")

# Clean and structure the data
def process_healthsites(df):
    """
    Process raw healthsites data into LLM-friendly format
    """
    processed = []

    for idx, row in df.iterrows():
        # Only include records with essential info
        facility_type = row['amenity'] or row['healthcare']
        if pd.isna(facility_type):
            continue

        facility = {
            'id': str(row['uuid']),
            'name': row['name'] if pd.notna(row['name']) else f"Unnamed {facility_type}",
            'type': str(facility_type),
            'location': {
                'latitude': float(row['Lattitude']) if pd.notna(row['Lattitude']) else None,
                'longitude': float(row['Longitude']) if pd.notna(row['Longitude']) else None,
                'city': row['addr_city'] if pd.notna(row['addr_city']) else None,
                'address': row['addr_street'] if pd.notna(row['addr_street']) else None,
                'postcode': row['addr_postcode'] if pd.notna(row['addr_postcode']) else None,
            },
            'details': {
                'operator': row['operator'] if pd.notna(row['operator']) else None,
                'operator_type': row['operator_type'] if pd.notna(row['operator_type']) else None,
                'operational_status': row['operational_status'] if pd.notna(row['operational_status']) else None,
                'opening_hours': row['opening_hours'] if pd.notna(row['opening_hours']) else None,
                'beds': int(row['beds']) if pd.notna(row['beds']) and row['beds'] != '' else None,
                'staff_doctors': int(row['staff_doctors']) if pd.notna(row['staff_doctors']) and row['staff_doctors'] != '' else None,
                'staff_nurses': int(row['staff_nurses']) if pd.notna(row['staff_nurses']) and row['staff_nurses'] != '' else None,
                'specialities': str(row['speciality']).split(';') if pd.notna(row['speciality']) and row['speciality'] != '' else [],
            },
            'services': {
                'dispensing': row['dispensing'] if pd.notna(row['dispensing']) else None,
                'emergency': row['emergency'] if pd.notna(row['emergency']) else None,
                'wheelchair': row['wheelchair'] if pd.notna(row['wheelchair']) else None,
                'insurance': row['insurance'] if pd.notna(row['insurance']) else None,
            },
            'infrastructure': {
                'water_source': row['water_source'] if pd.notna(row['water_source']) else None,
                'electricity': row['electricity'] if pd.notna(row['electricity']) else None,
            },
            'metadata': {
                'completeness': float(row['completeness']) if pd.notna(row['completeness']) else 0,
                'osm_id': str(row['osm_id']),
                'last_updated': row['changeset_timestamp'] if pd.notna(row['changeset_timestamp']) else None,
            }
        }

        # Remove None/empty values for cleaner output
        facility = {k: v for k, v in facility.items() if v}
        processed.append(facility)

    return processed

# Process the data
processed_facilities = process_healthsites(df)

print(f"\nProcessed {len(processed_facilities)} facilities with complete data")

# Create summary statistics
summary = {
    'total_facilities': len(processed_facilities),
    'facility_types': {},
    'by_location': {},
    'data_quality': {
        'with_coordinates': sum(1 for f in processed_facilities if f.get('location', {}).get('latitude')),
        'with_name': sum(1 for f in processed_facilities if f.get('name') and f['name'].startswith('Unnamed') == False),
        'with_operator': sum(1 for f in processed_facilities if f.get('details', {}).get('operator')),
    }
}

# Count by facility type
for facility in processed_facilities:
    ftype = facility.get('type', 'unknown')
    summary['facility_types'][ftype] = summary['facility_types'].get(ftype, 0) + 1

# Count by city
for facility in processed_facilities:
    city = facility.get('location', {}).get('city', 'Unknown')
    if city:
        summary['by_location'][city] = summary['by_location'].get(city, 0) + 1

print("\n=== Data Summary ===")
print(f"Total facilities: {summary['total_facilities']}")
print(f"With coordinates: {summary['data_quality']['with_coordinates']}")
print(f"With names: {summary['data_quality']['with_name']}")
print(f"With operators: {summary['data_quality']['with_operator']}")
print(f"\nFacility types:")
for ftype, count in sorted(summary['facility_types'].items(), key=lambda x: x[1], reverse=True):
    print(f"  {ftype}: {count}")

# Save processed data
output_path = csv_path.parent / "healthsites_processed.json"
with open(output_path, 'w') as f:
    json.dump({
        'facilities': processed_facilities,
        'summary': summary
    }, f, indent=2)

print(f"\n✓ Saved processed data to {output_path}")

# Create a compact version for LLM calls (top facilities)
compact_version = {
    'summary': summary,
    'sample_facilities': processed_facilities[:50],  # First 50 for context
}

compact_path = csv_path.parent / "healthsites_llm.json"
with open(compact_path, 'w') as f:
    json.dump(compact_version, f, indent=2)

print(f"✓ Saved LLM-ready version to {compact_path}")
print(f"\nFile size: {compact_path.stat().st_size / 1024:.1f} KB")
