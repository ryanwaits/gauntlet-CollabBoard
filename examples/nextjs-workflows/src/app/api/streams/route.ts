import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SECONDLAYER_API_URL!;
const API_KEY = process.env.SECONDLAYER_API_KEY!;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
});

// POST /api/streams — create stream
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/api/streams`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// GET /api/streams — list streams
export async function GET() {
  const res = await fetch(`${API_URL}/api/streams`, { headers: headers() });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
