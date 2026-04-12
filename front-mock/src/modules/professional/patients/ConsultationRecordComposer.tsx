import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ConsultationFormValues,
  consultationSchema,
} from "@/modules/professional/patients/consultation.schema";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

interface ConsultationRecordComposerProps {
  onCancel: () => void;
}

export function ConsultationRecordComposer({
  onCancel,
}: ConsultationRecordComposerProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
  });

  const onSubmit = handleSubmit(async () => {
    return;
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar registro"}
        </Button>
      </div>
    </form>
  );
}
