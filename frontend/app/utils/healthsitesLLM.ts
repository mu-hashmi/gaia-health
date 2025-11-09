/**
 * LLM integration utilities for healthsites data
 * Provides functions to prepare and use healthsites data with LLM APIs
 */

import { getFormattedFacilityContext, loadHealthsitesData, type Facility } from './healthsitesData';

/**
 * Prepare healthsites data for Claude API calls
 * Returns formatted context that can be used in system prompts or user messages
 */
export async function prepareHealthsitesContext(): Promise<string> {
  return getFormattedFacilityContext();
}

/**
 * Create a message with healthsites data for LLM analysis
 * Useful for questions about the healthcare network, facility optimization, etc.
 */
export async function createHealthsitesAnalysisMessage(query: string): Promise<string> {
  const context = await prepareHealthsitesContext();

  return `${context}\n\n## User Query\n${query}`;
}

/**
 * Generate a summary of facilities matching criteria for LLM processing
 */
export async function generateFacilitySummary(
  filter?: (facility: Facility) => boolean
): Promise<string> {
  const data = await loadHealthsitesData();
  const facilities = filter ? data.sample_facilities.filter(filter) : data.sample_facilities;

  let summary = `# Healthcare Facilities Summary\n\n`;
  summary += `Total facilities in result: ${facilities.length}\n\n`;

  // Group by type
  const byType: Record<string, number> = {};
  facilities.forEach(f => {
    byType[f.type] = (byType[f.type] || 0) + 1;
  });

  summary += `## By Type\n`;
  Object.entries(byType).forEach(([type, count]) => {
    summary += `- ${type}: ${count}\n`;
  });

  // Group by city
  const byCity: Record<string, number> = {};
  facilities.forEach(f => {
    if (f.location.city) {
      byCity[f.location.city] = (byCity[f.location.city] || 0) + 1;
    }
  });

  if (Object.keys(byCity).length > 0) {
    summary += `\n## By City\n`;
    Object.entries(byCity)
      .sort((a, b) => b[1] - a[1])
      .forEach(([city, count]) => {
        summary += `- ${city}: ${count}\n`;
      });
  }

  // List facilities with key details
  summary += `\n## Detailed Listing\n`;
  facilities.slice(0, 20).forEach(f => {
    summary += `\n- **${f.name}** (${f.type})`;
    if (f.location.city) summary += ` - ${f.location.city}`;
    if (f.details.operator) summary += ` [Operator: ${f.details.operator}]`;
    summary += '\n';
  });

  return summary;
}

/**
 * Create a specialized prompt for clinic optimization analysis
 */
export async function createClinicOptimizationPrompt(districtFilter?: string): Promise<string> {
  const data = await loadHealthsitesData();

  let prompt = `You are analyzing a healthcare network in Malawi. Here is data about the facilities:\n\n`;
  prompt += `## Dataset Overview\n`;
  prompt += `- Total Facilities: ${data.summary.total_facilities}\n`;
  prompt += `- Hospitals: ${data.summary.facility_types.hospital}\n`;
  prompt += `- Clinics: ${data.summary.facility_types.clinic}\n`;
  prompt += `- Pharmacies: ${data.summary.facility_types.pharmacy}\n`;
  prompt += `- Other: ${
    data.summary.total_facilities -
    (data.summary.facility_types.hospital +
      data.summary.facility_types.clinic +
      data.summary.facility_types.pharmacy)
  }\n\n`;

  prompt += `## Facility Details\n`;
  data.sample_facilities.slice(0, 30).forEach(f => {
    prompt += `\n### ${f.name}\n`;
    prompt += `- Type: ${f.type}\n`;
    if (f.location.city) prompt += `- Location: ${f.location.city}\n`;
    if (f.location.latitude && f.location.longitude) {
      prompt += `- Coordinates: (${f.location.latitude}, ${f.location.longitude})\n`;
    }
    if (f.details.operator) prompt += `- Operator: ${f.details.operator}\n`;
    if (f.details.beds) prompt += `- Beds: ${f.details.beds}\n`;
    if (f.details.staff_doctors) prompt += `- Doctors: ${f.details.staff_doctors}\n`;
    if (f.details.staff_nurses) prompt += `- Nurses: ${f.details.staff_nurses}\n`;
    if (f.details.opening_hours) prompt += `- Hours: ${f.details.opening_hours}\n`;
    if (f.details.specialities && f.details.specialities.length > 0) {
      prompt += `- Specialties: ${f.details.specialities.join(', ')}\n`;
    }
    if (f.metadata.completeness) {
      prompt += `- Data Completeness: ${f.metadata.completeness}%\n`;
    }
  });

  prompt += `\n## Analysis Task\n`;
  prompt += `Based on this healthcare facility data, provide insights on:\n`;
  prompt += `1. Network coverage and gaps\n`;
  prompt += `2. Resource distribution\n`;
  prompt += `3. Optimization opportunities\n`;
  prompt += `4. Priority areas for improvement\n`;

  return prompt;
}

/**
 * Format facilities data as a CSV string for LLM processing
 */
export async function getFacilitiesAsCSV(): Promise<string> {
  const data = await loadHealthsitesData();

  const headers = [
    'Name',
    'Type',
    'City',
    'Latitude',
    'Longitude',
    'Operator',
    'Beds',
    'Doctors',
    'Nurses',
    'Opening Hours',
    'Data Completeness (%)',
  ];

  let csv = headers.join(',') + '\n';

  data.sample_facilities.forEach(f => {
    const row = [
      `"${f.name}"`,
      f.type,
      f.location.city || '',
      f.location.latitude || '',
      f.location.longitude || '',
      f.details.operator || '',
      f.details.beds || '',
      f.details.staff_doctors || '',
      f.details.staff_nurses || '',
      f.details.opening_hours || '',
      f.metadata.completeness.toFixed(1),
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Get a minimal JSON representation for token efficiency
 */
export async function getMinimalFacilitiesJSON(): Promise<object[]> {
  const data = await loadHealthsitesData();

  return data.sample_facilities.map(f => ({
    name: f.name,
    type: f.type,
    city: f.location.city,
    operator: f.details.operator,
    beds: f.details.beds,
    coordinates: f.location.latitude && f.location.longitude ?
      [f.location.latitude, f.location.longitude] : null,
  }));
}

/**
 * Example usage function
 */
export async function exampleUsage() {
  // Get formatted context
  const context = await prepareHealthsitesContext();
  console.log('Context ready for LLM:\n', context);

  // Create analysis message
  const analysisMessage = await createHealthsitesAnalysisMessage(
    'What are the main healthcare gaps in the covered areas?'
  );
  console.log('\nAnalysis message:\n', analysisMessage);

  // Get optimization prompt
  const optimizationPrompt = await createClinicOptimizationPrompt();
  console.log('\nOptimization prompt:\n', optimizationPrompt);
}
