import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  createMedicalRecord,
  updateMedicalRecord,
} from "@/modules/medical-records/api/medical-records.api";
import {
  ConsultationFormValues,
  consultationSchema,
} from "@/modules/professional/patients/consultation.schema";
import { queryKeys } from "@/shared/constants/query-keys";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";

const nextControlOptions = [
  { value: "1_week", label: "1 semana" },
  { value: "2_weeks", label: "2 semanas" },
  { value: "3_weeks", label: "3 semanas" },
  { value: "4_weeks", label: "4 semanas" },
  { value: "1_month", label: "1 mes" },
  { value: "2_months", label: "2 meses" },
  { value: "3_months", label: "3 meses" },
  { value: "4_months", label: "4 meses" },
  { value: "5_months", label: "5 meses" },
  { value: "6_months", label: "6 meses" },
  { value: "9_months", label: "9 meses" },
  { value: "12_months", label: "12 meses" },
  { value: "to_define", label: "A definir" },
];

interface ConsultationRecordComposerProps {
  patientId: string;
  recordId?: string;
  initialValues?: Partial<ConsultationFormValues>;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function ConsultationRecordComposer({
  patientId,
  recordId,
  initialValues,
  onCancel,
  onSuccess,
}: ConsultationRecordComposerProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(recordId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      reason: initialValues?.reason ?? "",
      assessment: initialValues?.assessment ?? "",
      indications: initialValues?.indications ?? "",
      evolution: initialValues?.evolution ?? "",
      nextControl: initialValues?.nextControl ?? "1_week",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: ConsultationFormValues) => {
      const payload = {
        reason: values.reason,
        diagnosis: values.assessment,
        indications: values.indications,
        evolution: values.evolution,
        nextCheckup: values.nextControl,
      };

      if (recordId) {
        return updateMedicalRecord(recordId, payload);
      }

      return createMedicalRecord({
        patientId,
        ...payload,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPatientDetail(patientId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalPatientDetail(patientId), "record", recordId],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientMedicalRecords,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalMedicalRecords,
        }),
      ]);
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
        <span className="field-label">Evolucion (opcional)</span>
        <textarea className="textarea-base" {...register("evolution")} />
        {errors.evolution?.message ? <span className="field-error">{errors.evolution.message}</span> : null}
      </label>
      <Select
        label="Proximo control"
        error={errors.nextControl?.message}
        options={nextControlOptions}
        {...register("nextControl")}
      />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Guardar registro"}
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
