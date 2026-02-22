import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SECONDLAYER_API_URL!;
const API_KEY = process.env.SECONDLAYER_API_KEY!;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/streams/${id}/enable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
