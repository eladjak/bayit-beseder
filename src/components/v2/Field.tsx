import { useEffect, useId, useRef, useState } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, Ref } from "react";

type Shared = {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};
type Props = Shared &
  (
    | (Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
        multiline?: false;
        ref?: Ref<HTMLInputElement>;
      })
    | (Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
        multiline: true;
        type?: string;
        ref?: Ref<HTMLTextAreaElement>;
      })
  );
export function Field({
  label,
  hint,
  error,
  multiline,
  hideLabel,
  id: suppliedId,
  type = "text",
  className = "",
  ref,
  ...props
}: Props) {
  const generated = useId();
  const [count, setCount] = useState(String(props.defaultValue ?? "").length);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = wrapper.current?.closest("form");
    if (!form || !multiline) return;
    const reset = () => {
      window.setTimeout(
        () =>
          setCount(
            (wrapper.current?.querySelector("textarea")?.value ?? "").length,
          ),
        0,
      );
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [multiline]);
  const id = suppliedId || generated;
  const special = ["tel", "email", "number", "url", "date"].includes(type);
  const inputMode = (
    { tel: "tel", email: "email", number: "decimal", url: "url" } as const
  )[type as "tel" | "email" | "number" | "url"];
  const autoComplete = (
    {
      tel: "tel",
      email: "email",
      url: "url",
      number: "off",
      date: "off",
    } as const
  )[type as "tel" | "email" | "url" | "number" | "date"];
  const described =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  const common = {
    ...props,
    id,
    dir: special ? ("ltr" as const) : props.dir,
    inputMode: props.inputMode ?? inputMode,
    autoComplete: props.autoComplete ?? autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": described,
    className: `min-h-11 w-full rounded-bb-md border border-bb-line bg-bb-card px-3 py-2 text-bb-ink focus-visible:outline-2 focus-visible:outline-bb-primary ${className}`,
  };
  return (
    <div ref={wrapper} className="space-y-1 text-start">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "block font-semibold"}
      >
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-bb-sm text-bb-ink-2">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea
          {...(common as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          ref={ref as Ref<HTMLTextAreaElement>}
          onInput={(event) => {
            setCount(event.currentTarget.value.length);
            (
              props.onInput as
                React.FormEventHandler<HTMLTextAreaElement> | undefined
            )?.(event);
          }}
        />
      ) : (
        <input
          {...(common as InputHTMLAttributes<HTMLInputElement>)}
          ref={ref as Ref<HTMLInputElement>}
          type={type}
        />
      )}
      <div aria-live="polite">
        {error && (
          <p id={`${id}-error`} className="text-bb-sm text-bb-danger-ink">
            {error}
          </p>
        )}
      </div>
      {multiline && props.maxLength != null && (
        <p className="text-bb-sm text-bb-ink-2" dir="ltr">
          {props.value == null ? count : String(props.value).length} /{" "}
          {props.maxLength}
        </p>
      )}
    </div>
  );
}
