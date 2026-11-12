"use client";
import { useCallback, useRef, useState } from "react";
import { ArrowUp, Check as CheckIcon, LoaderCircle } from "lucide-react";
import { VoiceInputButton } from "@/components/voice-input-button";
import { Field } from "./Field";
import { IconButton } from "./IconButton";
type Props = {
  label: string;
  placeholder: string;
  submitLabel: string;
  errorMessage: string;
  savedMessage: string;
  onSubmit: (
    text: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
};
export function QuickAdd({
  label,
  placeholder,
  submitLabel,
  errorMessage,
  savedMessage,
  onSubmit,
}: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const transcript = useCallback(
    (value: string) =>
      setText((current) =>
        [current.trim(), value.trim()].filter(Boolean).join(" "),
      ),
    [],
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const submitted = text.trim();
    if (!submitted || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await onSubmit(submitted);
      if (result.ok) {
        setText((current) => (current.trim() === submitted ? "" : current));
        setSaved(true);
        input.current?.focus();
      } else setError(result.message);
    } catch {
      setError(errorMessage);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <Field
            ref={input}
            label={label}
            hideLabel
            placeholder={placeholder}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSaved(false);
            }}
            error={error}
          />
        </div>
        <span aria-live="polite">
          {saved && (
            <span className="inline-flex items-center gap-1 text-bb-sm text-bb-primary">
              <CheckIcon className="size-5" aria-hidden="true" />
              {savedMessage}
            </span>
          )}
        </span>
        <VoiceInputButton
          onTranscript={transcript}
          className="min-h-11 min-w-11 [&_button]:min-h-11 [&_button]:min-w-11"
        />
        <IconButton
          label={submitLabel}
          className="bg-bb-primary text-bb-on-primary hover:bg-bb-primary-hover disabled:bg-bb-card-hover disabled:text-bb-ink-2 disabled:opacity-100"
          type="submit"
          disabled={saving || !text.trim()}
          aria-busy={saving || undefined}
        >
          {saving ? (
            <LoaderCircle
              className="size-5 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowUp className="size-5" aria-hidden="true" />
          )}
        </IconButton>
      </div>
    </form>
  );
}
