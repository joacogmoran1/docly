import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteMedicalRecord,
  getMedicalRecord,
} from "@/modules/medical-records/api/medical-records.api";
import { ConsultationRecordComposer } from "@/modules/professional/patients/ConsultationRecordComposer";
import { mapMedicalRecordToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { RecordDetailView } from "@/shared/components/RecordDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

export function ProfessionalPatientRecordDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patientId = "", recordId = "" } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const query = useQuery({
    queryKey: [...queryKeys.professionalPatientDetail(patientId), "record", recordId],
    queryFn: () => getMedicalRecord(recordId),
    enabled: Boolean(recordId),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteMedicalRecord(recordId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPatientDetail(patientId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalMedicalRecords,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientMedicalRecords,
        }),
      ]);
      navigate(`/professional/patients/${patientId}?tab=records`);
    },
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando registro...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el registro.</div>;

  const record = mapMedicalRecordToItem(query.data);
  const initialValues = {
    reason: query.data.reason,
    assessment: query.data.diagnosis,
    indications: query.data.indications,
    evolution: query.data.evolution ?? "",
    nextControl: query.data.nextCheckup ?? "1_week",
  };

  return (
    <>
      <SubpageShell
        onBack={() => navigate(`/professional/patients/${patientId}?tab=records`)}
        headerAction={
          isEditing ? null : (
            <div className="row-wrap">
              <Button onClick={() => setIsEditing(true)}>
                Editar registro
              </Button>
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                Eliminar registro
              </Button>
            </div>
          )
        }
      >
        {isEditing ? (
          <Card title="Editar registro" description="Actualiza la informacion clinica del registro." className="panel-separated">
            <ConsultationRecordComposer
              patientId={patientId}
              recordId={recordId}
              initialValues={initialValues}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          </Card>
        ) : (
          <RecordDetailView
            title={record.title}
            timestamp={record.timestamp}
            body={record.body}
            reason={record.reason}
            diagnosis={record.diagnosis}
            treatment={record.treatment}
            notes={record.notes}
            vitalSigns={record.vitalSigns}
          />
        )}
      </SubpageShell>
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Eliminar registro"
        description="Esta accion eliminara el registro medico del historial del paciente."
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (deleteMutation.isPending) return;
          deleteMutation.mutate();
        }}
      />
      {deleteMutation.isError ? (
        <span className="field-error">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "No se pudo eliminar el registro medico."}
        </span>
      ) : null}
    </>
  );
}
