import { app } from "./app";
import { env } from "./config/env";
import { syncPermissionCatalog, syncSystemProfiles } from "./services/permission.service";
import { ensureSupportAdminFromEnv } from "./services/support-admin.service";

async function bootstrap() {
  await syncPermissionCatalog();
  await syncSystemProfiles();
  await ensureSupportAdminFromEnv();

  app.listen(env.PORT, () => {
    console.log(`[asstramed-crm-api] running at http://localhost:${env.PORT}`);
  });
}

void bootstrap();
