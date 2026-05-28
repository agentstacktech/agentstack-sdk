/**
 * Minimal controlled form + Zod parse + submit callback (no react-hook-form dependency).
 * Genetic tag: sdk.react.entity_form.gen1
 */

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import type { z } from 'zod';

export interface UseEntityFormOptions<T extends Record<string, unknown>> {
  schema: z.ZodType<T>;
  defaultValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseEntityFormReturn<T extends Record<string, unknown>> {
  values: Partial<T>;
  setValues: React.Dispatch<React.SetStateAction<Partial<T>>>;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  handleSubmit: (e?: FormEvent) => Promise<void>;
  reset: (next?: Partial<T>) => void;
}

export function useEntityForm<T extends Record<string, unknown>>(
  options: UseEntityFormOptions<T>
): UseEntityFormReturn<T> {
  const { schema, defaultValues = {}, onSubmit } = options;
  const [values, setValues] = useState<Partial<T>>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const reset = useCallback((next?: Partial<T>) => {
    setValues(next ?? defaultValues);
    setErrors({});
  }, [defaultValues]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      setIsSubmitting(true);
      setErrors({});
      try {
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
          const fieldErrors: Partial<Record<keyof T, string>> = {};
          for (const issue of parsed.error.issues) {
            const key = issue.path[0] as keyof T;
            if (key != null && fieldErrors[key] == null) {
              fieldErrors[key] = issue.message;
            }
          }
          setErrors(fieldErrors);
          return;
        }
        await onSubmit(parsed.data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, schema, values]
  );

  return useMemo(
    () => ({
      values,
      setValues,
      setField,
      errors,
      isSubmitting,
      handleSubmit,
      reset,
    }),
    [values, setValues, setField, errors, isSubmitting, handleSubmit, reset]
  );
}
