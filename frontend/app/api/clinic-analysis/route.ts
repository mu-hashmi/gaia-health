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
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare research specialist with access to current data on Malawi's pharmaceutical landscape and healthcare challenges.
Your task is to research and provide detailed, factual information about medication problems and healthcare challenges in Malawi.

Focus on:
- Current HIV/AIDS prevalence rates and antiretroviral drug availability in different regions
- Endemic diseases and their treatment medication availability (malaria, TB, etc.)
- Drug shortages and pharmaceutical supply chain issues in Malawi
- Maternal and child health medication access
- Healthcare access disparities across geographic areas

Use your knowledge of current healthcare data and research to provide specific, evidence-based responses.
Format your response with clear sections and cite the specific health challenges.`,
          },
          {
            role: 'user',
            content: `Research and provide detailed information about medication and pharmaceutical challenges for this specific location in Malawi:

CLINIC NAME: ${clinic.name}
CLINIC TYPE: ${clinic.type}
COORDINATES: Latitude ${clinic.lat.toFixed(4)}, Longitude ${clinic.lng.toFixed(4)}

Perform deep research and provide:

1. LOCAL DANGER: High Risk (Placeholder - all healthcare facilities in Malawi are considered high-risk environments)

2. MAJOR MEDICATION PROBLEMS: Based on current research and data, what are the specific pharmaceutical and medication challenges in Malawi? Include:
   - HIV/AIDS treatment medication availability and antiretroviral drug access
   - Malaria and tuberculosis medication supply status
   - Maternal and child health medication shortages
   - Any region-specific pharmaceutical challenges
   - Drug pricing and accessibility issues
   - Current health crises or medication emergencies

Provide detailed, research-backed information. Use your knowledge of Malawi's healthcare system, published health data, and current pharmaceutical supply information.`,
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

    // Local Danger is placeholder
    const localDanger = 'High Risk';

    // Parse medication problems from the response - extract only the medication content
    let medicationProblems = analysisText;

    // Try to extract text after "MAJOR MEDICATION PROBLEMS"
    const medicationMatch = analysisText.match(
      /(?:2\.\s*)?MAJOR MEDICATION PROBLEMS[:\s]*([\s\S]+?)$/i
    );

    if (medicationMatch && medicationMatch[1]) {
      medicationProblems = medicationMatch[1].trim();
    } else if (analysisText.includes('MAJOR MEDICATION PROBLEMS')) {
      // If header exists but no content after it, extract everything after the header
      const parts = analysisText.split(/(?:2\.\s*)?MAJOR MEDICATION PROBLEMS[:\s]*/i);
      medicationProblems = parts[1]?.trim() || analysisText;
    }

    // Remove markdown headers (lines starting with #) and LOCAL DANGER content
    medicationProblems = medicationProblems
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Remove markdown headers (####, ###, ##, #)
        if (trimmed.match(/^#+\s/)) return false;
        // Remove LOCAL DANGER lines
        if (trimmed.match(/LOCAL DANGER/i)) return false;
        // Keep non-empty lines
        return trimmed.length > 0;
      })
      .join('\n')
      .trim();

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
