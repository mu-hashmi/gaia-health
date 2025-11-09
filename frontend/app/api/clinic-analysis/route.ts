import { NextRequest, NextResponse } from 'next/server';
import { Clinic } from '../../types';

export async function POST(request: NextRequest) {
  try {
    const { clinic, isMedicalDesert } = await request.json() as {
      clinic: Clinic;
      isMedicalDesert: boolean;
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a specialized healthcare and security analyst focused on Malawi's healthcare landscape.
You have deep knowledge of:
- Malawi's regional security situations, conflict zones, gang activity, and crime hotspots
- HIV/AIDS prevalence rates across Malawi's regions and districts
- Pharmaceutical availability and drug shortage patterns in Malawi
- Healthcare access disparities across different geographic areas

Provide accurate, specific information based on real data about Malawi. Do not provide generic or placeholder responses.
Format your response with clear sections and include specific details about the area.`,
          },
          {
            role: 'user',
            content: `Provide a detailed analysis for this specific clinic in Malawi:

CLINIC NAME: ${clinic.name}
CLINIC TYPE: ${clinic.type}
COORDINATES: Latitude ${clinic.lat.toFixed(4)}, Longitude ${clinic.lng.toFixed(4)}

Analyze this specific location and provide detailed responses for:

1. LOCAL DANGER: What are the documented security risks, conflict zones, gang activity, and crime patterns specifically in this geographic area around the clinic's coordinates? Include any recent incidents or known danger zones within 10-20km of this location.

2. MAJOR MEDICATION PROBLEMS: What are the specific pharmaceutical challenges in this region? Include information about HIV prevalence rates, endemic diseases, drug availability issues, and any medication shortages that specifically affect this area.

Provide maximum detail and real, specific information for this location. If information is limited for this specific area, provide regional context. Do not provide generic responses.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to get LLM analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // Parse the response more flexibly to handle varied formatting
    const localDangerMatch = analysisText.match(
      /LOCAL DANGER[:\s]*(.+?)(?=MAJOR MEDICATION PROBLEMS|MEDICATION PROBLEMS|$)/i
    );
    const medicationMatch = analysisText.match(
      /MAJOR MEDICATION PROBLEMS[:\s]*(.+?)$/i
    ) || analysisText.match(
      /MEDICATION PROBLEMS[:\s]*(.+?)$/i
    );

    const localDanger = localDangerMatch?.[1]?.trim() || 'N/A';
    const medicationProblems = medicationMatch?.[1]?.trim() || 'N/A';

    const medicalDesert = isMedicalDesert
      ? 'Yes - No pharmacy within 5km'
      : 'No - Pharmacy within 5km';

    return NextResponse.json({
      clinic: clinic.name,
      clinicCoordinates: { lat: clinic.lat, lng: clinic.lng },
      localDanger,
      medicationProblems,
      medicalDesert,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis' },
      { status: 500 }
    );
  }
}
