import { app } from "./app";
import { env } from "./config/env";
import { syncPermissionCatalog, syncSystemProfiles } from "./services/permission.service";

async function bootstrap() {
  await syncPermissionCatalog();
  await syncSystemProfiles();

  app.listen(env.PORT, () => {
    console.log(`[asstramed-crm-api] running at http://localhost:${env.PORT}`);
  });
}

void bootstrap();
