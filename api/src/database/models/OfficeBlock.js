import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const OfficeBlock = db.define('OfficeBlock', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    officeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'office_id',
        references: {
            model: 'offices',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha del bloqueo',
    },
    /**
     * 'full_day'   → bloquea el día completo, startTime/endTime son null
     * 'time_range' → bloquea un rango horario puntual
     */
    type: {
        type: DataTypes.ENUM('full_day', 'time_range'),
        allowNull: false,
        defaultValue: 'full_day',
    },
    startTime: {
        type: DataTypes.TIME,
        field: 'start_time',
        comment: 'Hora de inicio del bloqueo (solo para time_range)',
    },
    endTime: {
        type: DataTypes.TIME,
        field: 'end_time',
        comment: 'Hora de fin del bloqueo (solo para time_range)',
    },
    reason: {
        type: DataTypes.STRING,
        comment: 'Motivo del bloqueo',
    },
}, {
    tableName: 'office_blocks',
    underscored: true,
    timestamps: true,
    indexes: [
        {
            fields: ['office_id', 'date'],
            name: 'office_blocks_office_date',
        },
        {
            fields: ['date'],
            name: 'office_blocks_date',
        },
    ],
});

export default OfficeBlock;