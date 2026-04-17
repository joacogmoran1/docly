const ENUMS = [
	'user_role',
	'patient_gender',
	'office_block_type',
	'appointment_status',
	'medical_record_next_checkup',
];

async function createEnums(sequelize, transaction) {
	await sequelize.query(
		`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
				CREATE TYPE user_role AS ENUM ('patient', 'professional');
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_gender') THEN
				CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other');
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'office_block_type') THEN
				CREATE TYPE office_block_type AS ENUM ('full_day', 'time_range');
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
				CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_record_next_checkup') THEN
				CREATE TYPE medical_record_next_checkup AS ENUM (
					'1_week', '2_weeks', '3_weeks', '4_weeks',
					'1_month', '2_months', '3_months', '4_months',
					'5_months', '6_months', '9_months', '12_months',
					'to_define'
				);
			END IF;
		END $$;
		`,
		{ transaction }
	);
}

async function createTables(sequelize, transaction) {
	await sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;', { transaction });
	await sequelize.query('CREATE EXTENSION IF NOT EXISTS btree_gist;', { transaction });

	await sequelize.query(
		`
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			name VARCHAR(255) NOT NULL,
			last_name VARCHAR(255),
			phone VARCHAR(255),
			role user_role NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			accepted_terms_at TIMESTAMPTZ NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS patients (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
			dni VARCHAR(255) UNIQUE,
			birth_date DATE NULL,
			gender patient_gender NULL,
			blood_type VARCHAR(10) NULL,
			medical_coverage VARCHAR(255) NULL,
			coverage_number VARCHAR(255) NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS professionals (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
			specialty VARCHAR(255) NOT NULL,
			license_number VARCHAR(255) NOT NULL UNIQUE,
			accepted_coverages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			fees NUMERIC(10, 2) NULL,
			signature TEXT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS health_infos (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
			diseases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			allergies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			medications TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS offices (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			address VARCHAR(255) NOT NULL,
			phone VARCHAR(255) NULL,
			appointment_duration INTEGER NOT NULL DEFAULT 30,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS schedules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
			day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
			start_time TIME NOT NULL,
			end_time TIME NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS office_blocks (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
			date DATE NOT NULL,
			type office_block_type NOT NULL DEFAULT 'full_day',
			start_time TIME NULL,
			end_time TIME NULL,
			reason VARCHAR(255) NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT office_blocks_time_consistency CHECK (
				(type = 'full_day' AND start_time IS NULL AND end_time IS NULL)
				OR
				(type = 'time_range' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
			)
		);

		CREATE TABLE IF NOT EXISTS patient_professionals (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (patient_id, professional_id)
		);

		CREATE TABLE IF NOT EXISTS appointments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
			office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
			date DATE NOT NULL,
			time TIME NOT NULL,
			duration INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0),
			status appointment_status NOT NULL DEFAULT 'pending',
			reason VARCHAR(255) NULL,
			notes TEXT NULL,
			cancellation_reason TEXT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS prescriptions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
			medications JSONB NOT NULL,
			diagnosis TEXT NULL,
			instructions TEXT NULL,
			valid_until DATE NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS studies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			professional_id UUID NULL REFERENCES professionals(id) ON DELETE SET NULL,
			type VARCHAR(255) NOT NULL,
			date DATE NOT NULL,
			results TEXT NULL,
			file_url VARCHAR(255) NULL,
			notes TEXT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS medical_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
			appointment_id UUID NULL UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
			date DATE NOT NULL DEFAULT CURRENT_DATE,
			reason TEXT NOT NULL,
			diagnosis TEXT NOT NULL,
			indications TEXT NOT NULL,
			evolution TEXT NULL,
			next_checkup medical_record_next_checkup NULL,
			vital_signs JSONB NOT NULL DEFAULT '{}'::JSONB,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			family UUID NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			revoked_at TIMESTAMPTZ NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS password_reset_tokens (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token VARCHAR(255) NOT NULL UNIQUE,
			expires_at TIMESTAMPTZ NOT NULL,
			used BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS rate_limit_hits (
			"key" VARCHAR(255) PRIMARY KEY,
			hits INTEGER NOT NULL DEFAULT 1,
			reset_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		`,
		{ transaction }
	);

	await sequelize.query(
		`
		CREATE INDEX IF NOT EXISTS office_blocks_office_date ON office_blocks (office_id, date);
		CREATE INDEX IF NOT EXISTS office_blocks_date ON office_blocks (date);
		CREATE INDEX IF NOT EXISTS appointments_date_time ON appointments (date, time);
		CREATE INDEX IF NOT EXISTS appointments_patient_id ON appointments (patient_id);
		CREATE INDEX IF NOT EXISTS appointments_professional_id ON appointments (professional_id);
		CREATE INDEX IF NOT EXISTS appointments_status ON appointments (status);
		CREATE INDEX IF NOT EXISTS prescriptions_patient_id ON prescriptions (patient_id);
		CREATE INDEX IF NOT EXISTS prescriptions_professional_id ON prescriptions (professional_id);
		CREATE INDEX IF NOT EXISTS medical_records_patient_id ON medical_records (patient_id);
		CREATE INDEX IF NOT EXISTS medical_records_professional_id ON medical_records (professional_id);
		CREATE INDEX IF NOT EXISTS medical_records_date ON medical_records (date);
		CREATE INDEX IF NOT EXISTS refresh_tokens_user_id ON refresh_tokens (user_id);
		CREATE INDEX IF NOT EXISTS refresh_tokens_family ON refresh_tokens (family);
		CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at ON refresh_tokens (expires_at);
		CREATE INDEX IF NOT EXISTS rate_limit_hits_reset_at ON rate_limit_hits (reset_at);
		`,
		{ transaction }
	);

	await sequelize.query(
		`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'appointments_office_active_slot_excl'
			) THEN
				ALTER TABLE appointments
				ADD CONSTRAINT appointments_office_active_slot_excl
				EXCLUDE USING gist (
					office_id WITH =,
					tsrange(
						(date::timestamp + "time"),
						(date::timestamp + "time" + make_interval(mins => duration)),
						'[)'
					) WITH &&
				)
				WHERE (status IN ('pending', 'confirmed'));
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_active_slot_excl'
			) THEN
				ALTER TABLE appointments
				ADD CONSTRAINT appointments_patient_active_slot_excl
				EXCLUDE USING gist (
					patient_id WITH =,
					tsrange(
						(date::timestamp + "time"),
						(date::timestamp + "time" + make_interval(mins => duration)),
						'[)'
					) WITH &&
				)
				WHERE (status IN ('pending', 'confirmed'));
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'office_blocks_overlap_excl'
			) THEN
				ALTER TABLE office_blocks
				ADD CONSTRAINT office_blocks_overlap_excl
				EXCLUDE USING gist (
					office_id WITH =,
					tsrange(
						(date::timestamp + COALESCE(start_time, TIME '00:00')),
						CASE
							WHEN type = 'full_day' THEN (date::timestamp + INTERVAL '1 day')
							ELSE (date::timestamp + end_time)
						END,
						'[)'
					) WITH &&
				);
			END IF;
		END $$;
		`,
		{ transaction }
	);
}

async function dropTables(sequelize, transaction) {
	await sequelize.query(
		`
		DROP TABLE IF EXISTS rate_limit_hits;
		DROP TABLE IF EXISTS password_reset_tokens;
		DROP TABLE IF EXISTS refresh_tokens;
		DROP TABLE IF EXISTS medical_records;
		DROP TABLE IF EXISTS studies;
		DROP TABLE IF EXISTS prescriptions;
		DROP TABLE IF EXISTS appointments;
		DROP TABLE IF EXISTS patient_professionals;
		DROP TABLE IF EXISTS office_blocks;
		DROP TABLE IF EXISTS schedules;
		DROP TABLE IF EXISTS offices;
		DROP TABLE IF EXISTS health_infos;
		DROP TABLE IF EXISTS professionals;
		DROP TABLE IF EXISTS patients;
		DROP TABLE IF EXISTS users;
		`,
		{ transaction }
	);
}

async function dropEnums(sequelize, transaction) {
	for (const enumName of ENUMS) {
		await sequelize.query(`DROP TYPE IF EXISTS ${enumName};`, { transaction });
	}
}

export default {
	async up({ sequelize, transaction }) {
		await createEnums(sequelize, transaction);
		await createTables(sequelize, transaction);
	},
	async down({ sequelize, transaction }) {
		await dropTables(sequelize, transaction);
		await dropEnums(sequelize, transaction);
	},
};
