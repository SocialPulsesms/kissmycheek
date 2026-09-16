import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, history: [] }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ success: true, disabled: true }, { status: 200 });
}
