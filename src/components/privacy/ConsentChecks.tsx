"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export interface ConsentValues {
  age: boolean;
  privacy: boolean;
  terms: boolean;
}

export type ConsentErrors = Partial<Record<keyof ConsentValues, string>>;

export interface ConsentChecksHandle {
  /** Move focus to the first unchecked box (used after a failed submit). */
  focusFirstInvalid: (errors: ConsentErrors) => void;
}

interface Props {
  idPrefix: string;
  values: ConsentValues;
  errors: ConsentErrors;
  onChange: (next: ConsentValues) => void;
  /**
   * "three": age, privacy policy, terms (the gate).
   * "two":   age, and one box for privacy policy + terms (registration, where
   *          space is tight). Both variants record the same three flags.
   */
  variant?: "three" | "two";
  disabled?: boolean;
}


interface RowProps {
  id: string;
  inputRef: React.Ref<HTMLInputElement>;
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: React.ReactNode;
  error?: string;
  disabled?: boolean;
}

function CheckRow({ id, inputRef, checked, onToggle, label, error, disabled }: RowProps) {
  const errId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-11 items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed transition-colors duration-150 motion-reduce:transition-none ${
          error
            ? "border-danger bg-danger/5"
            : checked
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-surface hover:bg-surface-hover"
        } ${disabled ? "opacity-60" : "cursor-pointer"}`}
      >
        {/* The visible box is 24px; its tap area is 44px (the whole row is also the label's target). */}
        <span data-touch-target className="-m-2.5 flex size-11 shrink-0 items-center justify-center">
        <input
          id={id}
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          required
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-6 shrink-0 cursor-pointer accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        </span>
        <span className="text-foreground">{label}</span>
      </label>
      {error && (
        <p id={errId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The required consent checkboxes.
 *
 * Native checkboxes (keyboard, screen reader and form behaviour for free),
 * each row is a >=44px tap target, the label is bound to the input, and an
 * error is announced and tied to its box through aria-describedby.
 * Policy links open in a new tab so ticked boxes are never lost.
 */
export const ConsentChecks = forwardRef<ConsentChecksHandle, Props>(function ConsentChecks(
  { idPrefix, values, errors, onChange, variant = "three", disabled },
  ref,
) {
  const { t } = useTranslation();
  const ageRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusFirstInvalid(e) {
      if (e.age) ageRef.current?.focus();
      else if (e.privacy) privacyRef.current?.focus();
      else if (e.terms) (variant === "two" ? privacyRef : termsRef).current?.focus();
    },
  }));

  const linkClass =
    "py-3.5 font-semibold text-primary underline underline-offset-2 hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm"; // py-3.5: a 44px tap area for the inline link without moving the text

  const privacyLink = (
    <Link href="/privacy" target="_blank" rel="noopener" className={linkClass}>
      {t("privacy.gate.privacyLink")}
    </Link>
  );
  const termsLink = (
    <Link href="/terms" target="_blank" rel="noopener" className={linkClass}>
      {t("privacy.gate.termsLink")}
    </Link>
  );

  return (
    <div className="space-y-2.5">
      <CheckRow
        id={`${idPrefix}-age`}
        inputRef={ageRef}
        checked={values.age}
        onToggle={(v) => onChange({ ...values, age: v })}
        label={t("privacy.gate.age")}
        error={errors.age}
        disabled={disabled}
      />
      {variant === "three" ? (
        <>
          <CheckRow
            id={`${idPrefix}-privacy`}
            inputRef={privacyRef}
            checked={values.privacy}
            onToggle={(v) => onChange({ ...values, privacy: v })}
            label={
              <>
                {t("privacy.gate.privacyPrefix")}
                {privacyLink}
              </>
            }
            error={errors.privacy}
            disabled={disabled}
          />
          <CheckRow
            id={`${idPrefix}-terms`}
            inputRef={termsRef}
            checked={values.terms}
            onToggle={(v) => onChange({ ...values, terms: v })}
            label={
              <>
                {t("privacy.gate.termsPrefix")}
                {termsLink}
              </>
            }
            error={errors.terms}
            disabled={disabled}
          />
        </>
      ) : (
        <CheckRow
          id={`${idPrefix}-privacy`}
          inputRef={privacyRef}
          checked={values.privacy && values.terms}
          onToggle={(v) => onChange({ ...values, privacy: v, terms: v })}
          label={
            <>
              {t("privacy.register.agree")}
              {privacyLink}
              {t("privacy.register.and")}
              {termsLink}
              {t("privacy.register.agreeSuffix")}
            </>
          }
          error={errors.privacy ?? errors.terms}
          disabled={disabled}
        />
      )}
    </div>
  );
});
