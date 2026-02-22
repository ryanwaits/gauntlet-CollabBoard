"use client";

import type { EventTriggerConfig } from "@/types/node-configs";
import { FormField, SelectInput, NumberInput } from "./form-field";

export function EventTriggerForm({
  config,
  onChange,
}: {
  config: EventTriggerConfig;
  onChange: (c: Partial<EventTriggerConfig>) => void;
}) {
  return (
    <>
      <FormField label="Network">
        <SelectInput
          value={config.network}
          onChange={(v) => onChange({ network: v })}
          options={[
            { value: "mainnet", label: "Mainnet" },
            { value: "testnet", label: "Testnet" },
          ]}
        />
      </FormField>
      <FormField label="Start Block">
        <NumberInput
          value={config.startBlock}
          onChange={(v) => onChange({ startBlock: v })}
          placeholder="Latest"
        />
      </FormField>
    </>
  );
}
