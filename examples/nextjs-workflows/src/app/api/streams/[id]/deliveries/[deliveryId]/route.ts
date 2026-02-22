import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SECONDLAYER_API_URL!;
const API_KEY = process.env.SECONDLAYER_API_KEY!;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  const { id, deliveryId } = await params;
  const res = await fetch(`${API_URL}/api/streams/${id}/deliveries/${deliveryId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: text || `HTTP ${res.status}` }, { status: res.status });
  }
}
