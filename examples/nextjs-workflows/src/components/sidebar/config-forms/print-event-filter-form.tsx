"use client";

import type { PrintEventFilterConfig } from "@/types/node-configs";
import { FormField, TextInput } from "./form-field";

export function PrintEventFilterForm({
  config,
  onChange,
}: {
  config: PrintEventFilterConfig;
  onChange: (c: Partial<PrintEventFilterConfig>) => void;
}) {
  return (
    <>
      <FormField label="Contract ID">
        <TextInput value={config.contractId ?? ""} onChange={(v) => onChange({ contractId: v || undefined })} placeholder="SP..contract-name" />
      </FormField>
      <FormField label="Topic">
        <TextInput value={config.topic ?? ""} onChange={(v) => onChange({ topic: v || undefined })} placeholder="Event topic (optional)" />
      </FormField>
      <FormField label="Contains">
        <TextInput value={config.contains ?? ""} onChange={(v) => onChange({ contains: v || undefined })} placeholder="Search string (optional)" />
      </FormField>
    </>
  );
}
