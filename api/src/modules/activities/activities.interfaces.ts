import { ActivityStatus } from "@prisma/client";

export interface ListActivitiesFilters {
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: ActivityStatus;
  companyId?: string;
  responsibleId?: string;
  tagKey?: string;
}
