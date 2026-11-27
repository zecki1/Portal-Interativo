-- Tabelas do Portal Interativo no SQL Server (Sequelize)
-- Executar no banco local apontado por DATABASE_URL.

IF OBJECT_ID('dbo.user_overrides', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_overrides (
    username    NVARCHAR(256) NOT NULL PRIMARY KEY,
    role        NVARCHAR(64)  NOT NULL DEFAULT N'Convidado',
    isActive    BIT           NOT NULL DEFAULT 1,
    workgroup   NVARCHAR(128) NULL,
    team        NVARCHAR(128) NULL,
    externalId  NVARCHAR(256) NULL,
    createdAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('dbo.guest_accounts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.guest_accounts (
    id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    username    NVARCHAR(256) NOT NULL UNIQUE,
    firstName   NVARCHAR(256) NOT NULL,
    lastName    NVARCHAR(256) NOT NULL,
    email       NVARCHAR(320) NOT NULL UNIQUE,
    role        NVARCHAR(64)  NOT NULL DEFAULT N'Convidado',
    workgroup   NVARCHAR(128) NOT NULL,
    team        NVARCHAR(128) NULL,
    isActive    BIT           NOT NULL DEFAULT 1,
    passwordHash NVARCHAR(256) NULL,
    createdBy   NVARCHAR(256) NULL,
    createdAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('dbo.resource_assets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.resource_assets (
    id             UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    name           NVARCHAR(300) NOT NULL,
    originalName   NVARCHAR(300) NULL,
    blobName       NVARCHAR(600) NOT NULL,
    container      NVARCHAR(128) NOT NULL,
    blobUrl        NVARCHAR(MAX) NOT NULL,
    contentType    NVARCHAR(200) NOT NULL,
    size           BIGINT        NOT NULL DEFAULT 0,
    checksumSha256 NVARCHAR(64)  NULL,
    workgroup      NVARCHAR(128) NULL,
    team           NVARCHAR(128) NULL,
    uploadedBy     NVARCHAR(256) NULL,
    updatedBy      NVARCHAR(256) NULL,
    deletedBy      NVARCHAR(256) NULL,
    kind           NVARCHAR(64)  NULL,
    category       NVARCHAR(128) NULL,
    projectId      NVARCHAR(128) NULL,
    status         NVARCHAR(32)  NOT NULL DEFAULT N'active',
    deletedAt      DATETIME2     NULL,
    createdAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_guest_accounts_workgroup' AND object_id = OBJECT_ID('dbo.guest_accounts'))
  CREATE INDEX IX_guest_accounts_workgroup ON dbo.guest_accounts(workgroup);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_workgroup' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_workgroup ON dbo.resource_assets(workgroup);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_status_createdAt' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_status_createdAt ON dbo.resource_assets(status, createdAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_kind_category' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_kind_category ON dbo.resource_assets(kind, category);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_projectId' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_projectId ON dbo.resource_assets(projectId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_resource_assets_container_blobName' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE UNIQUE INDEX UX_resource_assets_container_blobName ON dbo.resource_assets(container, blobName);
GO
