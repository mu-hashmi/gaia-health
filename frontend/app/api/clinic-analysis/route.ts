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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a healthcare analyst for Malawi. Provide concise analysis in exactly 2 lines or less. If no information available, respond with N/A.',
          },
          {
            role: 'user',
            content: `Analyze the clinic in Malawi. Provide 2 lines max for each metric. LOCAL DANGER: security risks (conflict, gang violence, crime). MEDICATION PROBLEMS: major pharmaceutical issues (HIV rates, drug shortages). If no info available, respond with N/A.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
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

    const localDangerMatch = analysisText.match(
      /LOCAL DANGER:\s*(.+?)(?=MEDICATION PROBLEMS:|$)/s
    );
    const medicationMatch = analysisText.match(/MEDICATION PROBLEMS:\s*(.+?)$/s);

    const localDanger = localDangerMatch?.[1]?.trim() || 'N/A';
    const medicationProblems = medicationMatch?.[1]?.trim() || 'N/A';

    const medicalDesert = isMedicalDesert
      ? 'Yes - No pharmacy within 5km'
      : 'No - Pharmacy within 5km';

    return NextResponse.json({
      clinic: clinic.name,
      localDanger: localDanger.slice(0, 150),
      medicationProblems: medicationProblems.slice(0, 150),
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
