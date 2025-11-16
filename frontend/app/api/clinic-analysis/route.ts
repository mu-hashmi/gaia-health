import { NextRequest, NextResponse } from 'next/server';
import { Clinic } from '../../types';
import { isMedicalDesert, getNearbyPharmacies, loadPharmacies } from '../../utils/pharmacyLoader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, clinicName, district } = body;

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Load pharmacy data
    const pharmacies = await loadPharmacies();
    const isDesert = isMedicalDesert(lat, lng, pharmacies, 5);
    const nearbyPharmacies = getNearbyPharmacies(lat, lng, pharmacies, 5);

    const locationContext = `
Location Details:
- Latitude: ${lat}
- Longitude: ${lng}
${clinicName ? `- Clinic Name: ${clinicName}` : ''}
${district ? `- District: ${district}` : ''}
- Country: Malawi
- Total Pharmacies in Database: ${pharmacies.length}
- Nearby Pharmacies (within 5km): ${nearbyPharmacies.length} found
- Medical Desert Status: ${isDesert ? 'Yes (no pharmacy within 5km)' : 'No (pharmacy found within 5km)'}
`;

    const pharmacyContext = nearbyPharmacies.length > 0
      ? `Nearby Pharmacies (within 5km):\n${nearbyPharmacies.slice(0, 5).map((p, idx) => `${idx + 1}. ${p.name || 'Unnamed Pharmacy'} (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`).join('\n')}`
      : 'No pharmacies found within 5km radius.';

    const prompt = `You are a healthcare access analyst for Malawi. Analyze the following clinic location and provide a comprehensive assessment.

${locationContext}

${pharmacyContext}

IMPORTANT FORMATTING REQUIREMENTS:
- Section headers must be formatted as: "1. Location Overview" (NO bold markers **, NO period at end)
- Each section must have EXACTLY ONE bullet point (only one sentence)
- Keep responses concise and practical
- Use clear, simple language
- ALWAYS spell "pharmacy" correctly (NOT "Pharmaciyes" or "Pharamcys")
- If you are not 100% certain about information, use "N/A" instead of guessing
- Research available information about this location in Malawi
- If no reliable information is found after research, use "N/A" for that bullet point

Please provide a detailed analysis in the following format:

1. Location Overview
- One sentence describing the geographic location and context in Malawi.

2. Location History
- One sentence about any historical events, conflicts, gang wars, civil unrest, or security incidents in this area, or "N/A" if uncertain.

3. Medical Desert Analysis
- One sentence stating: "Medical Desert: ${isDesert ? 'Yes' : 'No'}" (based on pharmacy within 5km) and discussing the implications for healthcare access.

4. Preventable Health Issues
- One sentence identifying the most common preventable health issues and specific diseases in this area, or "N/A" if uncertain.

5. Safety Risks Assessment
- One sentence rating the overall safety risk level (Low/Medium/High) and describing specific safety concerns, or "N/A" if uncertain.

6. Recommendations
- One sentence with actionable recommendations for improving healthcare access and safety improvements if needed.

Remember: 
- Headers format: "1. Location Overview" (no **, no period)
- Each section has EXACTLY ONE bullet point
- Use "N/A" if you are not 100% certain about the information`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a healthcare access analyst specializing in Malawi. Provide detailed, practical, and accurate assessments of healthcare facility locations. Use your knowledge of Malawi geography, history, healthcare infrastructure, and current events. IMPORTANT: If you are not 100% certain about specific information (especially location history, conflicts, health issues, or safety concerns), you MUST use "N/A" rather than making assumptions or guesses. Only provide information you are confident about based on your knowledge of Malawi. ALWAYS spell "pharmacy" correctly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get analysis from OpenAI', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || 'No analysis available';

    return NextResponse.json({
      analysis,
      isMedicalDesert: isDesert,
      nearbyPharmaciesCount: nearbyPharmacies.length,
      hasPharmacyData: pharmacies.length > 0,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis' },
      { status: 500 }
    );
  }
}
