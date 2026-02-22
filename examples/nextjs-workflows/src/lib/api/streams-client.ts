import type { CreateStreamPayload, StreamFilter, StreamOptions } from "@/lib/workflow/compile-stream";

export interface StreamResponse {
  id: string;
  name: string;
  status: "inactive" | "active" | "paused" | "failed";
  webhookUrl: string;
  filters: StreamFilter[];
  options: StreamOptions;
  totalDeliveries: number;
  failedDeliveries: number;
  lastTriggeredAt: string | null;
  lastTriggeredBlock: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStreamResponse {
  stream: StreamResponse;
  webhookSecret: string;
}

export interface Delivery {
  id: string;
  blockHeight: number;
  status: "success" | "failed" | "pending";
  statusCode: number | null;
  responseTimeMs: number | null;
  attempts: number;
  error: string | null;
  createdAt: string;
}

export interface DeliveryDetail extends Delivery {
  payload: unknown;
}

export interface DeliveriesResponse {
  deliveries: Delivery[];
  total: number;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try { message = JSON.parse(text).error || message; } catch { /* use default */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const streamsApi = {
  create: (data: CreateStreamPayload) =>
    request<CreateStreamResponse>("POST", "/api/streams", data),

  get: (id: string) =>
    request<StreamResponse>("GET", `/api/streams/${id}`),

  update: (id: string, data: Partial<CreateStreamPayload>) =>
    request<StreamResponse>("PATCH", `/api/streams/${id}`, data),

  delete: (id: string) =>
    request<void>("DELETE", `/api/streams/${id}`),

  enable: (id: string) =>
    request<StreamResponse>("POST", `/api/streams/${id}/enable`),

  disable: (id: string) =>
    request<StreamResponse>("POST", `/api/streams/${id}/disable`),

  list: () =>
    request<{ streams: StreamResponse[]; total: number }>("GET", "/api/streams"),

  trigger: (id: string, blockHeight: number) =>
    request<unknown>("POST", `/api/streams/${id}/trigger`, { blockHeight }),

  replay: (id: string, fromBlock: number, toBlock: number) =>
    request<unknown>("POST", `/api/streams/${id}/replay`, { fromBlock, toBlock }),

  deliveries: (id: string, params?: { limit?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return request<DeliveriesResponse>("GET", `/api/streams/${id}/deliveries${query ? `?${query}` : ""}`);
  },

  delivery: (streamId: string, deliveryId: string) =>
    request<DeliveryDetail>("GET", `/api/streams/${streamId}/deliveries/${deliveryId}`),
};
