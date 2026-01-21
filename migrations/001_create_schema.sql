
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_users_email ON users(email);


CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    created_by UUID NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_created_by ON service_requests(created_by);

CREATE TABLE request_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    changed_by UUID NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    note TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_request
        FOREIGN KEY (request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE INDEX idx_audits_request_id ON request_audits(request_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
