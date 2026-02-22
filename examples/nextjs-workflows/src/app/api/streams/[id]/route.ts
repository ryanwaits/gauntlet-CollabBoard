import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SECONDLAYER_API_URL!;
const API_KEY = process.env.SECONDLAYER_API_KEY!;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
});

// GET /api/streams/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/streams/${id}`, { headers: headers() });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// PATCH /api/streams/:id — update stream
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${API_URL}/api/streams/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// DELETE /api/streams/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/streams/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
