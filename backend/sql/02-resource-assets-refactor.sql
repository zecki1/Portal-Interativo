-- Migração incremental: refino da arquitetura de storage/resource_assets.
-- Segura para rodar mais de uma vez.

IF COL_LENGTH('dbo.resource_assets', 'originalName') IS NULL
  ALTER TABLE dbo.resource_assets ADD originalName NVARCHAR(300) NULL;
IF COL_LENGTH('dbo.resource_assets', 'checksumSha256') IS NULL
  ALTER TABLE dbo.resource_assets ADD checksumSha256 NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.resource_assets', 'updatedBy') IS NULL
  ALTER TABLE dbo.resource_assets ADD updatedBy NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.resource_assets', 'deletedBy') IS NULL
  ALTER TABLE dbo.resource_assets ADD deletedBy NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.resource_assets', 'kind') IS NULL
  ALTER TABLE dbo.resource_assets ADD kind NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.resource_assets', 'category') IS NULL
  ALTER TABLE dbo.resource_assets ADD category NVARCHAR(128) NULL;
IF COL_LENGTH('dbo.resource_assets', 'projectId') IS NULL
  ALTER TABLE dbo.resource_assets ADD projectId NVARCHAR(128) NULL;
IF COL_LENGTH('dbo.resource_assets', 'status') IS NULL
  ALTER TABLE dbo.resource_assets ADD status NVARCHAR(32) NOT NULL CONSTRAINT DF_resource_assets_status DEFAULT N'active';
IF COL_LENGTH('dbo.resource_assets', 'deletedAt') IS NULL
  ALTER TABLE dbo.resource_assets ADD deletedAt DATETIME2 NULL;
GO

UPDATE dbo.resource_assets SET status = N'active' WHERE status IS NULL OR LTRIM(RTRIM(status)) = N'';
UPDATE dbo.resource_assets SET originalName = name WHERE originalName IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_status_createdAt' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_status_createdAt ON dbo.resource_assets(status, createdAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_kind_category' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_kind_category ON dbo.resource_assets(kind, category);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_resource_assets_projectId' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE INDEX IX_resource_assets_projectId ON dbo.resource_assets(projectId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_resource_assets_container_blobName' AND object_id = OBJECT_ID('dbo.resource_assets'))
  CREATE UNIQUE INDEX UX_resource_assets_container_blobName ON dbo.resource_assets(container, blobName);
GO
