import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createMedicalRecord } from "@/modules/medical-records/api/medical-records.api";
import {
  ConsultationFormValues,
  consultationSchema,
} from "@/modules/professional/patients/consultation.schema";
import { queryKeys } from "@/shared/constants/query-keys";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

interface ConsultationRecordComposerProps {
  patientId: string;
  professionalId: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function ConsultationRecordComposer({
  patientId,
  professionalId,
  onCancel,
  onSuccess,
}: ConsultationRecordComposerProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
  });
  const mutation = useMutation({
    mutationFn: (values: ConsultationFormValues) =>
      createMedicalRecord({
        patientId,
        professionalId,
        diagnosis: values.reason,
        treatment: values.indications,
        notes: [values.assessment, values.evolution, values.nextControl]
          .filter(Boolean)
          .join("\n\n"),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.professionalPatientDetail(patientId),
      });
      onSuccess?.();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <form className="minimal-form" onSubmit={onSubmit}>
      <Input label="Motivo de consulta" error={errors.reason?.message} {...register("reason")} />
      <label className="form-field">
        <span className="field-label">Analisis</span>
        <textarea className="textarea-base" {...register("assessment")} />
        {errors.assessment?.message ? <span className="field-error">{errors.assessment.message}</span> : null}
      </label>
      <label className="form-field">
        <span className="field-label">Indicaciones</span>
        <textarea className="textarea-base" {...register("indications")} />
        {errors.indications?.message ? <span className="field-error">{errors.indications.message}</span> : null}
      </label>
      <label className="form-field">
        <span className="field-label">Evolucion</span>
        <textarea className="textarea-base" {...register("evolution")} />
        {errors.evolution?.message ? <span className="field-error">{errors.evolution.message}</span> : null}
      </label>
      <Input label="Proximo control" error={errors.nextControl?.message} {...register("nextControl")} />
      <Input label="Adjuntos" {...register("attachments")} />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? "Guardando..." : "Guardar registro"}
        </Button>
      </div>
      {mutation.isError ? (
        <span className="field-error">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "No se pudo crear el registro."}
        </span>
      ) : null}
    </form>
  );
}
