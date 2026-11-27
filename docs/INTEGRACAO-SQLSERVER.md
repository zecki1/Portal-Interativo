# Integração SQL Server + usuários externos + armazenamento de arquivos

## Visão geral

| Base/destino | Uso | Como é acessado |
|---|---|---|
| **Local** (`DATABASE_URL`) | cargos, convidados, ativos, metadados de arquivos | Sequelize + SQL Server |
| **Externa** (`DB_*`) | diretório e login (`username, first_name, last_name, email, is_active, password`) | Sequelize + SQL Server, **somente leitura** |
| **SFTP** (`SFTP_*`) | binários dos arquivos enviados pela API | `ssh2-sftp-client` |
| **Azure Blob** | reservado para quando houver credenciais | `@azure/storage-blob` |

Zod valida a entrada da API e os dados lidos do banco. A camada legada de
catálogo/analytics continua em Prisma. **Não há código, schema ou framework da
aplicação de origem**: a base externa é SQL puro. Por decisão explícita, o login
também usa a senha PBKDF2 já gravada na coluna configurada em
`EXTERNAL_PASSWORD_COLUMN`; a verificação é feita só com `node:crypto`.

```
Frontend → /api/v1/directory/* → Sequelize (local + externa) → SQL Server
         → /api/v1/blob/*      → SFTP (padrão) + tabela resource_assets
         → /auth/login         → cadastro local → convidado → usuário externo
```

## Arquivos

- `src/lib/sequelize.ts` — conexões local/externa
- `src/schemas/directory.ts` — schemas Zod
- `src/models/index.ts` — `UserOverride`, `GuestAccount`, `ResourceAsset`
- `src/services/directoryService.ts` — diretório, overrides, convidados e login externo
- `src/services/storageService.ts` — SFTP/local/Azure + metadados
- `src/services/azureBlobService.ts` — implementação Azure (desligada por padrão)
- `src/services/mailService.ts` — SendGrid SMTP
- `src/routes/directory.ts`, `src/routes/storage.ts`
- `sql/01-directory.sql` — DDL das 3 tabelas

## Endpoints

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/v1/directory/users` | visualizar | externos + ajustes locais + convidados |
| PATCH | `/api/v1/directory/users/:username/override` | admin | cargo, ativo, workgroup, time |
| GET | `/api/v1/directory/guests` | visualizar | contas convidadas (sem hash) |
| POST | `/api/v1/directory/guests` | admin | cria convidado + envia e-mail |
| DELETE | `/api/v1/directory/guests/:id` | admin | remove convidado |
| GET | `/api/v1/directory/status` | admin | status das conexões |
| GET | `/api/v1/blob/resources` | visualizar | lista metadados |
| POST | `/api/v1/blob/resources` | criar | upload multipart (`multipart/form-data`) |
| GET | `/api/v1/blob/resources/:id/content` | visualizar | baixa o binário do storage |
| GET | `/api/v1/blob/resources/:id/url` | visualizar | URL pública/SAS |
| DELETE | `/api/v1/blob/resources/:id` | excluir | remove do storage e do SQL |

## Cargos e convidados

1. O diretório externo traz `username, first_name, last_name, email, is_active`.
2. Cargo efetivo = **override local** → coluna configurada em `EXTERNAL_ROLE_COLUMN` → `Convidado`.
3. `PATCH .../override` grava em `user_overrides`; a base externa nunca é alterada.
4. Convidados ficam só em `guest_accounts`, com `workgroup` obrigatório, `team`
   opcional e senha temporária em hash bcrypt. O e-mail de convite é enviado por
   SendGrid; a senha nunca é devolvida pela API.

## Configuração externa validada

- Host/instância: `SDBSQL2022D1\SQLSERVER2022H1` → `DB_SERVER=10.163.38.90`,
  `DB_PORT=1435` (porta descoberta via SQL Browser; o host resolve para `10.163.38.90`).
- Banco: `DB_NAME=optimizeh`; tabela: `EXTERNAL_USERS_TABLE=dbo.auth_user`;
  senha: `EXTERNAL_PASSWORD_COLUMN=password`. A base é **somente leitura**.
- A consulta usa `LOWER(username) = :value OR LOWER(email) = :value` e lê
  `username, first_name, last_name, email, is_active, password`.
- `QueryTypes.SELECT` do Sequelize devolve as linhas diretamente; o código
  normaliza esse formato e o `[linhas, metadata]` para não quebrar o login.

## Login externo

- `POST /api/v1/auth/login` aceita `{ "email": "..." }`, `{ "username": "..." }`
  ou o username no campo `email` (o que o frontend envia).
- Ordem de busca: cadastro local do Portal → `guest_accounts` → usuário externo.
- Senha local incorreta **não** bloqueia a tentativa no SQL: isso era o que
  acontecia com `ezequiel.regino@sesisp.org.br`, que também era o admin local.
  O seed local desse e-mail foi removido (`data/usuarios.json` incluído).
- A sessão é criada com o identificador digitado e depois alinhada ao e-mail
  real do token (`vincularSessaoEmail`), evitando 401 nas requisições seguintes.
- No externo, o `SELECT` lê a coluna `password` (somente leitura) e verifica
  `pbkdf2_sha256$<iterações>$<salt>$<hash>` (ou `pbkdf2_sha1`) com `pbkdf2Sync`
  e comparação em tempo constante. Iterações e tamanhos são limitados.
- Respeita `is_active` e `user_overrides.isActive`; cargo efetivo = override
  local → `EXTERNAL_ROLE_MAP` → coluna externa → `Convidado`.
- `EXTERNAL_ROLE_MAP` (opcional) define cargo por usuário ou e-mail sem gravar
  na base externa: `EXTERNAL_ROLE_MAP=ss1111235:Administrador`. É necessário
  quando a tabela externa não tem coluna de cargo e o SQL local está indisponível.
- A tela “Usuários e cargos” mescla cadastro local e diretório externo; para
  usuários externos a troca de cargo usa `PATCH /directory/users/:username/override`.
- Como o banco local do Portal pode estar indisponível, o cargo atribuído pela
  tela é gravado em `backend/data/user-overrides.json` (tabela própria do
  Portal, sincronizada por username e e-mail). Se o SQL local subir, a tabela
  `user_overrides` passa a ter precedência. O arquivo é ignorado pelo controle
  de versão e não contém senhas.
- A tela tem filtro por nome/e-mail/usuário e mantém a tabela com altura fixa
  (~10 linhas) e rolagem vertical para percorrer todos os usuários.
- `papelExterno()` consulta o cargo pelo identificador recebido (e-mail do token)
  e pelo username/e-mail do usuário externo, para que a atribuição feita na tela
  altere permissões na requisição seguinte, sem precisar relogar.
- O hash nunca é devolvido pela API nem copiado ao banco local. O refresh token
  passa a levar o e-mail para renovar sessões de usuários externos.

## Armazenamento

`STORAGE_DRIVER`:

- `sftp` (**padrão**) — arquivos em `SFTP_BASE_DIR`, credenciais em `SFTP_*`.
  Se `SFTP_PUBLIC_BASE_URL` estiver vazio, a URL devolvida é a rota autenticada
  `/api/v1/blob/resources/:id/content`.
- `local` — arquivos em `STORAGE_LOCAL_DIR` (padrão `backend/data/assets`), para dev.
- `azure` — usa `AZURE_BLOB_CONNECTION_STRING`; ativar depois que as credenciais existirem.

Em todos os casos os metadados (nome, tipo, tamanho, workgroup, time, quem enviou)
ficam na tabela `resource_assets`.

## Configuração

1. Preencher **somente** `backend/.env` (modelo em `backend/.env.example`).
2. Rodar `backend/sql/01-directory.sql` no banco local.
3. `npm run build` e reiniciar a API.
4. `GET /api/v1/directory/status` → `{ local: true, externo: true, driver: "sftp", ... }`.

Nomes de tabela/coluna são validados por regex antes de virar SQL; nenhuma
credencial fica no código e a base externa não recebe INSERT/UPDATE/DELETE.
