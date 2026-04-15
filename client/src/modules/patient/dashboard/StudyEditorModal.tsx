import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  getStudyTypeDefinition,
  studyTypeOptions,
} from "@/shared/constants/medical-options";
import type { ApiStudy } from "@/shared/types/api";

export interface StudyEditorValues {
  type: string;
  date: string;
  reportContent: string;
  attachmentContent: string;
}

interface StudyEditorModalProps {
  isOpen: boolean;
  study?: ApiStudy | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: StudyEditorValues) => Promise<void> | void;
}

interface StudyEditorState {
  type: string;
  date: string;
  reportExisting: string;
  attachmentExisting: string;
  imageLinks: string;
  reportFile: File | null;
  attachmentFile: File | null;
}

function getInitialValues(study?: ApiStudy | null): StudyEditorState {
  const definition = getStudyTypeDefinition(study?.type);
  const existingAttachment = study?.fileUrl ?? "";

  return {
    type: study?.type ?? studyTypeOptions[0]?.value ?? "",
    date: study?.date ?? "",
    reportExisting: study?.results ?? "",
    attachmentExisting: definition.attachmentKind === "pdf" ? existingAttachment : "",
    imageLinks: definition.attachmentKind === "image" ? existingAttachment : "",
    reportFile: null,
    attachmentFile: null,
  };
}

function isPdfSource(value: string) {
  const trimmed = value.trim();
  return /^data:application\/pdf;base64,/i.test(trimmed) || /\.pdf($|[?#])/i.test(trimmed);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export function StudyEditorModal({
  isOpen,
  study,
  isSubmitting = false,
  onClose,
  onSubmit,
}: StudyEditorModalProps) {
  const [values, setValues] = useState<StudyEditorState>(getInitialValues(study));
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValues(getInitialValues(study));
      setSubmitError(null);
    }
  }, [isOpen, study]);

  const studyDefinition = useMemo(
    () => getStudyTypeDefinition(values.type),
    [values.type],
  );

  const hasReport = Boolean(values.reportFile || values.reportExisting.trim());
  const hasAttachment =
    studyDefinition.attachmentKind === "pdf"
      ? Boolean(values.attachmentFile || values.attachmentExisting.trim())
      : Boolean(values.imageLinks.trim());

  const reportError =
    !values.reportFile && values.reportExisting.trim() && !isPdfSource(values.reportExisting)
      ? "El informe guardado no es un PDF valido."
      : "";
  const attachmentError =
    studyDefinition.attachmentKind === "pdf" &&
    !values.attachmentFile &&
    values.attachmentExisting.trim() &&
    !isPdfSource(values.attachmentExisting)
      ? "Los resultados guardados no son un PDF valido."
      : "";

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const reportContent = values.reportFile
        ? await fileToDataUrl(values.reportFile)
        : values.reportExisting.trim();
      const attachmentContent =
        studyDefinition.attachmentKind === "pdf"
          ? values.attachmentFile
            ? await fileToDataUrl(values.attachmentFile)
            : values.attachmentExisting.trim()
          : values.imageLinks
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .join(", ");

      await onSubmit({
        type: values.type,
        date: values.date,
        reportContent,
        attachmentContent,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo procesar el archivo.");
    }
  };

  const isInvalid =
    !values.type ||
    !values.date ||
    !hasReport ||
    !hasAttachment ||
    Boolean(reportError || attachmentError);

  return (
    <Modal
      isOpen={isOpen}
      title={study ? "Editar estudio" : "Agregar estudio"}
      description="Carga el informe como archivo PDF. Los resultados tambien van en PDF cuando el estudio lo requiere; solo las imagenes se cargan por link."
      onClose={onClose}
    >
      <div className="minimal-form">
        <Select
          label="Tipo de estudio"
          options={studyTypeOptions}
          value={values.type}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              type: event.target.value,
            }))
          }
        />
        <Input
          label="Fecha"
          type="date"
          value={values.date}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              date: event.target.value,
            }))
          }
        />

        <label className="form-field">
          <span className="field-label">Informe (archivo PDF)</span>
          <input
            className="input-base"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                reportFile: event.target.files?.[0] ?? null,
              }))
            }
          />
          {values.reportFile ? (
            <span className="helper-text">Archivo seleccionado: {values.reportFile.name}</span>
          ) : values.reportExisting ? (
            <span className="helper-text">Ya hay un informe PDF cargado.</span>
          ) : (
            <span className="helper-text">Selecciona un PDF desde tu equipo.</span>
          )}
          {reportError ? <span className="field-error">{reportError}</span> : null}
        </label>

        {studyDefinition.attachmentKind === "pdf" ? (
          <label className="form-field">
            <span className="field-label">Resultados (archivo PDF)</span>
            <input
              className="input-base"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  attachmentFile: event.target.files?.[0] ?? null,
                }))
              }
            />
            {values.attachmentFile ? (
              <span className="helper-text">
                Archivo seleccionado: {values.attachmentFile.name}
              </span>
            ) : values.attachmentExisting ? (
              <span className="helper-text">Ya hay resultados PDF cargados.</span>
            ) : (
              <span className="helper-text">Selecciona un PDF desde tu equipo.</span>
            )}
            {attachmentError ? <span className="field-error">{attachmentError}</span> : null}
          </label>
        ) : (
          <Input
            label="Imagenes (links separados por coma)"
            value={values.imageLinks}
            placeholder="https://.../imagen-1.jpg, https://.../imagen-2.jpg"
            hint="Para estudios por imagen, carga uno o varios links."
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                imageLinks: event.target.value,
              }))
            }
          />
        )}

        {submitError ? <span className="field-error">{submitError}</span> : null}

        <div className="form-actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isInvalid || isSubmitting}>
            {isSubmitting ? "Guardando..." : study ? "Guardar cambios" : "Crear estudio"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
