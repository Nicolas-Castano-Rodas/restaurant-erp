"use client";

import { useState } from "react";
import { MovementIcon } from "@/components/workspace/operation-icons";

const choices = [
  { kind: "ENTRY", label: "Entrada", className: "movement-entry" },
  { kind: "EXIT", label: "Salida", className: "movement-exit" },
  { kind: "WASTE", label: "Merma", className: "movement-waste" },
] as const;

export function MovementTypeButtons() {
  const [kind, setKind] = useState<"ENTRY" | "EXIT" | "WASTE">("ENTRY");
  return (
    <fieldset className="movement-types">
      <legend className="sr-only">Tipo de movimiento</legend>
      <input type="hidden" name="kind" value={kind} />
      <div className="movement-buttons">
        {choices.map((choice) => (
          <button
            key={choice.kind}
            type="button"
            aria-pressed={kind === choice.kind}
            className={`movement-type-button ${choice.className}`}
            onClick={() => setKind(choice.kind)}
          >
            <MovementIcon kind={choice.kind} />
            <span>{choice.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
