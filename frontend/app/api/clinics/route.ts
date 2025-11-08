import { NextResponse } from 'next/server';
import { loadAllClinics } from '../../utils/dataLoader';

export async function GET() {
  try {
    const clinics = await loadAllClinics();
    return NextResponse.json(clinics);
  } catch (error) {
    console.error('Error loading clinics:', error);
    return NextResponse.json({ error: 'Failed to load clinics' }, { status: 500 });
  }
}

