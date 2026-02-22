"use client";

import type { WebhookActionConfig } from "@/types/node-configs";
import { FormField, SelectInput, TextInput, NumberInput } from "./form-field";

export function WebhookActionForm({
  config,
  onChange,
}: {
  config: WebhookActionConfig;
  onChange: (c: Partial<WebhookActionConfig>) => void;
}) {
  return (
    <>
      <FormField label="URL">
        <TextInput
          value={config.url}
          onChange={(v) => onChange({ url: v })}
          placeholder="https://example.com/webhook"
        />
      </FormField>
      <FormField label="Method">
        <SelectInput
          value={config.method}
          onChange={(v) => onChange({ method: v as WebhookActionConfig["method"] })}
          options={[
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
          ]}
        />
      </FormField>
      <FormField label="Retry Count">
        <NumberInput
          value={config.retryCount}
          onChange={(v) => onChange({ retryCount: v ?? 3 })}
          placeholder="3"
        />
      </FormField>
    </>
  );
}
