import { DataTypes, Model, type Sequelize } from "sequelize";

/** Cargo/estado de um usuário externo: decisão LOCAL (sobrescreve a origem). */
export class UserOverride extends Model {
  declare username: string;
  declare role: string;
  declare isActive: boolean;
  declare workgroup: string | null;
  declare team: string | null;
  declare externalId: string | null;
}

/** Conta convidada: existe somente no nosso banco. */
export class GuestAccount extends Model {
  declare id: string;
  declare username: string;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare role: string;
  declare workgroup: string;
  declare team: string | null;
  declare isActive: boolean;
  declare passwordHash: string | null;
  declare createdBy: string | null;
}

/** Metadados de um arquivo enviado ao storage (SFTP/local/Azure). */
export class ResourceAsset extends Model {
  declare id: string;
  declare name: string;
  declare blobName: string;
  declare container: string;
  declare blobUrl: string;
  declare contentType: string;
  declare size: number;
  declare workgroup: string | null;
  declare team: string | null;
  declare uploadedBy: string | null;
  declare kind: string | null;
  declare category: string | null;
  declare projectId: string | null;
  declare status: string;
  declare deletedAt: Date | null;
  declare originalName: string | null;
  declare checksumSha256: string | null;
  declare updatedBy: string | null;
  declare deletedBy: string | null;
}

let initialized = false;

export function initModels(sequelize: Sequelize): void {
  if (initialized) return;
  initialized = true;

  UserOverride.init(
    {
      username: { type: DataTypes.STRING(256), primaryKey: true },
      role: { type: DataTypes.STRING(64), defaultValue: "Convidado", allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      workgroup: { type: DataTypes.STRING(128), allowNull: true },
      team: { type: DataTypes.STRING(128), allowNull: true },
      externalId: { type: DataTypes.STRING(256), allowNull: true },
    },
    { sequelize, tableName: "user_overrides", timestamps: true, updatedAt: "updatedAt", createdAt: "createdAt" },
  );

  GuestAccount.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      username: { type: DataTypes.STRING(256), allowNull: false, unique: true },
      firstName: { type: DataTypes.STRING(256), allowNull: false },
      lastName: { type: DataTypes.STRING(256), allowNull: false },
      email: { type: DataTypes.STRING(320), allowNull: false, unique: true },
      role: { type: DataTypes.STRING(64), defaultValue: "Convidado", allowNull: false },
      workgroup: { type: DataTypes.STRING(128), allowNull: false },
      team: { type: DataTypes.STRING(128), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      passwordHash: { type: DataTypes.STRING(256), allowNull: true },
      createdBy: { type: DataTypes.STRING(256), allowNull: true },
    },
    { sequelize, tableName: "guest_accounts", timestamps: true, updatedAt: "updatedAt", createdAt: "createdAt" },
  );

  ResourceAsset.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(300), allowNull: false },
      blobName: { type: DataTypes.STRING(600), allowNull: false },
      container: { type: DataTypes.STRING(128), allowNull: false },
      blobUrl: { type: DataTypes.TEXT, allowNull: false },
      contentType: { type: DataTypes.STRING(200), allowNull: false },
      size: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      workgroup: { type: DataTypes.STRING(128), allowNull: true },
      team: { type: DataTypes.STRING(128), allowNull: true },
      uploadedBy: { type: DataTypes.STRING(256), allowNull: true },
      kind: { type: DataTypes.STRING(64), allowNull: true },
      category: { type: DataTypes.STRING(128), allowNull: true },
      projectId: { type: DataTypes.STRING(128), allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "active" },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
      originalName: { type: DataTypes.STRING(300), allowNull: true },
      checksumSha256: { type: DataTypes.STRING(64), allowNull: true },
      updatedBy: { type: DataTypes.STRING(256), allowNull: true },
      deletedBy: { type: DataTypes.STRING(256), allowNull: true },
    },
    { sequelize, tableName: "resource_assets", timestamps: true, updatedAt: "updatedAt", createdAt: "createdAt" },
  );
}

/** Inicializa os models na conexão local e garante as tabelas (ambientes de dev). */
export async function initLocalModels(sync = false): Promise<void> {
  const { sequelizeLocal, temBancoLocal } = await import("../lib/sequelize.js");
  if (!temBancoLocal()) return;
  const sequelize = sequelizeLocal();
  initModels(sequelize);
  if (sync) await sequelize.sync({ alter: false });
}
