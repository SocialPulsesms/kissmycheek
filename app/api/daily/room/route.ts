import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, disabled: true }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ success: false, disabled: true }, { status: 200 });
}
