import PDFDocument from 'pdfkit';
import { Prescription, Patient, Professional, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';

// ── Constantes de layout ─────────────────────────────────────────────────
const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const COLORS = {
    primary: '#1a1a2e',
    secondary: '#4a4a6a',
    accent: '#2563eb',
    light: '#6b7280',
    line: '#d1d5db',
    bg: '#f8fafc',
};

class PrescriptionPdfService {
    /**
     * Genera un Buffer con el PDF de la receta.
     * Incluye: datos del profesional, datos del paciente, medicaciones,
     * diagnóstico, indicaciones, validez y firma digital.
     */
    async generate(prescriptionId) {
        // Obtener receta con TODAS las relaciones necesarias
        const prescription = await Prescription.findByPk(prescriptionId, {
            include: [
                {
                    association: 'patient',
                    include: [
                        {
                            association: 'user',
                            attributes: ['name', 'lastName', 'email', 'phone'],
                        },
                    ],
                },
                {
                    association: 'professional',
                    // Incluir firma para el PDF
                    include: [
                        {
                            association: 'user',
                            attributes: ['name', 'lastName', 'email', 'phone'],
                        },
                    ],
                },
            ],
        });

        if (!prescription) {
            throw new ApiError(404, 'Receta no encontrada.');
        }

        const professional = prescription.professional;
        const patient = prescription.patient;

        if (!professional?.signature) {
            throw new ApiError(400, 'La receta no puede descargarse porque el profesional no tiene firma cargada.');
        }

        // Generar PDF en memoria
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
                    info: {
                        Title: `Receta - ${patient.user.lastName} ${patient.user.name}`,
                        Author: `${professional.user.name} ${professional.user.lastName}`,
                        Subject: 'Receta médica',
                        Creator: 'Docly',
                    },
                });

                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                this._drawHeader(doc, professional);
                this._drawPatientSection(doc, patient, prescription);
                this._drawMedications(doc, prescription.medications);
                this._drawDiagnosisAndInstructions(doc, prescription);
                this._drawFooter(doc, professional, prescription);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // =====================================================================
    // SECCIONES DEL PDF
    // =====================================================================

    /**
     * Encabezado: datos del profesional
     */
    _drawHeader(doc, professional) {
        const profName = `${professional.user.name} ${professional.user.lastName}`;

        // Nombre del profesional
        doc
            .font('Helvetica-Bold')
            .fontSize(16)
            .fillColor(COLORS.primary)
            .text(profName, PAGE_MARGIN, PAGE_MARGIN, { width: CONTENT_WIDTH, align: 'center' });

        // Especialidad y matrícula
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLORS.secondary)
            .text(professional.specialty || '', { width: CONTENT_WIDTH, align: 'center' })
            .text(`M.N. ${professional.licenseNumber}`, { width: CONTENT_WIDTH, align: 'center' });

        // Contacto
        const contactParts = [];
        if (professional.user.phone) contactParts.push(professional.user.phone);
        if (professional.user.email) contactParts.push(professional.user.email);

        if (contactParts.length > 0) {
            doc
                .fontSize(9)
                .fillColor(COLORS.light)
                .text(contactParts.join('  |  '), { width: CONTENT_WIDTH, align: 'center' });
        }

        // Línea separadora
        const lineY = doc.y + 10;
        doc
            .moveTo(PAGE_MARGIN, lineY)
            .lineTo(PAGE_WIDTH - PAGE_MARGIN, lineY)
            .strokeColor(COLORS.accent)
            .lineWidth(1.5)
            .stroke();

        doc.y = lineY + 15;
    }

    /**
     * Datos del paciente + fecha
     */
    _drawPatientSection(doc, patient, prescription) {
        const startY = doc.y;

        doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(COLORS.accent)
            .text('PACIENTE', PAGE_MARGIN, startY);

        doc.y = startY + 14;

        const patientName = `${patient.user.name} ${patient.user.lastName}`;

        const fields = [
            { label: 'Nombre', value: patientName },
        ];

        if (patient.dni) fields.push({ label: 'DNI', value: patient.dni });
        if (patient.medicalCoverage) {
            let coverage = patient.medicalCoverage;
            if (patient.coverageNumber) coverage += ` (${patient.coverageNumber})`;
            fields.push({ label: 'Cobertura', value: coverage });
        }

        for (const field of fields) {
            doc
                .font('Helvetica-Bold')
                .fontSize(9)
                .fillColor(COLORS.primary)
                .text(`${field.label}: `, PAGE_MARGIN, doc.y, { continued: true })
                .font('Helvetica')
                .fillColor(COLORS.secondary)
                .text(field.value);
        }

        // Fecha a la derecha
        const dateStr = this._formatDate(prescription.createdAt);
        doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(COLORS.primary)
            .text('Fecha: ', PAGE_MARGIN, startY + 14, { continued: true, width: CONTENT_WIDTH, align: 'right' })
            .font('Helvetica')
            .text(dateStr, { width: CONTENT_WIDTH, align: 'right' });

        // Línea
        doc.y = Math.max(doc.y, startY + 55) + 5;
        doc
            .moveTo(PAGE_MARGIN, doc.y)
            .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
            .strokeColor(COLORS.line)
            .lineWidth(0.5)
            .stroke();

        doc.y += 15;
    }

    /**
     * Tabla de medicamentos
     */
    _drawMedications(doc, medications) {
        if (!medications || medications.length === 0) return;

        doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(COLORS.accent)
            .text('MEDICACIÓN', PAGE_MARGIN, doc.y);

        doc.y += 12;

        // Header de tabla
        const colX = {
            name: PAGE_MARGIN,
            dose: PAGE_MARGIN + CONTENT_WIDTH * 0.35,
            frequency: PAGE_MARGIN + CONTENT_WIDTH * 0.55,
            duration: PAGE_MARGIN + CONTENT_WIDTH * 0.78,
        };

        const headerY = doc.y;

        // Fondo del header
        doc
            .rect(PAGE_MARGIN, headerY - 2, CONTENT_WIDTH, 16)
            .fill(COLORS.bg);

        doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.primary);

        doc.text('Medicamento', colX.name, headerY, { width: CONTENT_WIDTH * 0.34 });
        doc.text('Dosis', colX.dose, headerY, { width: CONTENT_WIDTH * 0.19 });
        doc.text('Frecuencia', colX.frequency, headerY, { width: CONTENT_WIDTH * 0.22 });
        doc.text('Duración', colX.duration, headerY, { width: CONTENT_WIDTH * 0.22 });

        doc.y = headerY + 18;

        // Filas
        for (const med of medications) {
            const rowY = doc.y;

            doc
                .font('Helvetica')
                .fontSize(9)
                .fillColor(COLORS.secondary);

            doc.text(med.name || '-', colX.name, rowY, { width: CONTENT_WIDTH * 0.34 });
            doc.text(med.dose || '-', colX.dose, rowY, { width: CONTENT_WIDTH * 0.19 });
            doc.text(med.frequency || '-', colX.frequency, rowY, { width: CONTENT_WIDTH * 0.22 });
            doc.text(med.duration || '-', colX.duration, rowY, { width: CONTENT_WIDTH * 0.22 });

            doc.y = Math.max(doc.y, rowY + 14);

            // Línea entre filas
            doc
                .moveTo(PAGE_MARGIN, doc.y)
                .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
                .strokeColor(COLORS.line)
                .lineWidth(0.3)
                .stroke();

            doc.y += 4;
        }

        doc.y += 10;
    }

    /**
     * Diagnóstico e indicaciones
     */
    _drawDiagnosisAndInstructions(doc, prescription) {
        if (prescription.diagnosis) {
            doc
                .font('Helvetica-Bold')
                .fontSize(9)
                .fillColor(COLORS.accent)
                .text('DIAGNÓSTICO', PAGE_MARGIN, doc.y);

            doc.y += 4;

            doc
                .font('Helvetica')
                .fontSize(9)
                .fillColor(COLORS.secondary)
                .text(prescription.diagnosis, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

            doc.y += 12;
        }

        if (prescription.instructions) {
            doc
                .font('Helvetica-Bold')
                .fontSize(9)
                .fillColor(COLORS.accent)
                .text('INDICACIONES', PAGE_MARGIN, doc.y);

            doc.y += 4;

            doc
                .font('Helvetica')
                .fontSize(9)
                .fillColor(COLORS.secondary)
                .text(prescription.instructions, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

            doc.y += 12;
        }
    }

    /**
     * Pie: validez + firma del profesional
     */
    _drawFooter(doc, professional, prescription) {
        // Validez
        if (prescription.validUntil) {
            doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor(COLORS.light)
                .text(
                    `Válida hasta: ${this._formatDate(prescription.validUntil)}`,
                    PAGE_MARGIN, doc.y,
                    { width: CONTENT_WIDTH }
                );

            doc.y += 15;
        }

        // Posicionar la firma en la parte inferior derecha
        const signatureAreaY = Math.max(doc.y + 30, PAGE_HEIGHT - 180);

        // Línea de firma
        const signLineX = PAGE_WIDTH - PAGE_MARGIN - 180;
        const signLineY = signatureAreaY + 70;

        // Imagen de firma
        if (professional.signature) {
            try {
                // Extraer base64 puro del data URI
                const base64Data = professional.signature.replace(/^data:image\/\w+;base64,/, '');
                const signatureBuffer = Buffer.from(base64Data, 'base64');

                doc.image(signatureBuffer, signLineX + 15, signatureAreaY, {
                    width: 150,
                    height: 65,
                    fit: [150, 65],
                    align: 'center',
                });
            } catch {
                // Si la firma no se puede procesar, continuar sin ella
            }
        }

        doc
            .moveTo(signLineX, signLineY)
            .lineTo(signLineX + 180, signLineY)
            .strokeColor(COLORS.primary)
            .lineWidth(0.5)
            .stroke();

        // Nombre y matrícula bajo la firma
        const profName = `${professional.user.name} ${professional.user.lastName}`;

        doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(COLORS.primary)
            .text(profName, signLineX, signLineY + 5, { width: 180, align: 'center' });

        doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.secondary)
            .text(professional.specialty || '', signLineX, doc.y, { width: 180, align: 'center' })
            .text(`M.N. ${professional.licenseNumber}`, signLineX, doc.y, { width: 180, align: 'center' });

        // Disclaimer
        doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(COLORS.light)
            .text(
                'Documento generado digitalmente por Docly. Esta receta tiene validez como prescripción médica digital.',
                PAGE_MARGIN,
                PAGE_HEIGHT - PAGE_MARGIN - 15,
                { width: CONTENT_WIDTH, align: 'center' }
            );
    }

    // =====================================================================
    // UTILIDADES
    // =====================================================================

    _formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
}

export default new PrescriptionPdfService();