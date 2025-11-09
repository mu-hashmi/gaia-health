import { NextResponse } from 'next/server';
import { loadDistricts } from '../../utils/districtLoader';

export async function GET() {
  try {
    const districts = await loadDistricts();
    return NextResponse.json(districts);
  } catch (error) {
    console.error('Error loading districts:', error);
    return NextResponse.json({ error: 'Failed to load districts' }, { status: 500 });
  }
}

