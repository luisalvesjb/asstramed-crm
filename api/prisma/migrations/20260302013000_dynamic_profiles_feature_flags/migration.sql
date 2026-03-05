-- Dynamic profiles and profile permissions
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_key_key" ON "Profile"("key");

CREATE TABLE "ProfilePermission" (
    "profileId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfilePermission_pkey" PRIMARY KEY ("profileId", "permissionId")
);

ALTER TABLE "User"
ADD COLUMN "profileId" TEXT;

INSERT INTO "Profile" (
    "id",
    "key",
    "name",
    "description",
    "isAdmin",
    "isSystem",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES
    ('profile-admin', 'ADMIN', 'Administrador', 'Perfil administrativo do sistema', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('profile-gestor', 'GESTOR', 'Gestor', 'Perfil gestor', false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('profile-tecnico', 'TECNICO', 'Tecnico', 'Perfil tecnico', false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('profile-financeiro', 'FINANCEIRO', 'Financeiro', 'Perfil financeiro', false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "User" u
SET "profileId" = p."id"
FROM "Profile" p
WHERE p."key" = u."role"::text;

UPDATE "User" u
SET "isAdmin" = p."isAdmin"
FROM "Profile" p
WHERE p."id" = u."profileId";

INSERT INTO "ProfilePermission" ("profileId", "permissionId", "createdAt")
SELECT
    p."id",
    rp."permissionId",
    rp."createdAt"
FROM "RolePermission" rp
JOIN "Profile" p ON p."key" = rp."role"::text
ON CONFLICT ("profileId", "permissionId") DO NOTHING;

ALTER TABLE "User"
ALTER COLUMN "profileId" SET NOT NULL;

ALTER TABLE "User"
ADD CONSTRAINT "User_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProfilePermission"
ADD CONSTRAINT "ProfilePermission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfilePermission"
ADD CONSTRAINT "ProfilePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "RolePermission";
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";
