-- CreateTable
CREATE TABLE "RolePermission" (
  "role" "Role" NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role", "permissionId")
);

-- AddForeignKey
ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
