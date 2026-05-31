import { cn } from "@/lib/utils";
import type { TonePreference } from "@draftly/shared";

const TONES: TonePreference[] = ["semi-formal", "friendly", "formal", "concise"];

interface TonePickerProps {
  value: string;
  onChange: (value: TonePreference) => void;
  disabled?: boolean;
}

export function TonePicker({ value, onChange, disabled }: TonePickerProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {TONES.map((tone) => (
        <button
          key={tone}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tone)}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
            value === tone
              ? "border-brand-500 bg-brand-500/10 text-brand-300"
              : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
          )}
        >
          {tone}
        </button>
      ))}
    </div>
  );
}
