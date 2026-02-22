"use client";

import type { ContractFilterConfig } from "@/types/node-configs";
import { FormField, TextInput } from "./form-field";

export function ContractFilterForm({
  config,
  onChange,
}: {
  config: ContractFilterConfig;
  onChange: (c: Partial<ContractFilterConfig>) => void;
}) {
  return (
    <>
      <FormField label="Contract ID">
        <TextInput value={config.contractId ?? ""} onChange={(v) => onChange({ contractId: v || undefined })} placeholder="SP..contract-name" />
      </FormField>
      <FormField label="Function Name">
        <TextInput value={config.functionName ?? ""} onChange={(v) => onChange({ functionName: v || undefined })} placeholder="function-name (optional)" />
      </FormField>
      <FormField label="Sender">
        <TextInput value={config.sender ?? ""} onChange={(v) => onChange({ sender: v || undefined })} placeholder="SP... (optional)" />
      </FormField>
    </>
  );
}
