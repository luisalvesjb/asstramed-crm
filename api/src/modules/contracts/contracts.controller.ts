import { Request, Response } from "express";
import { createContractSchema, listContractsSchema } from "./contracts.validators";
import * as contractsService from "./contracts.service";
import { PERMISSIONS } from "../../config/permissions";

export async function listContracts(req: Request, res: Response): Promise<void> {
  const { companyId } = listContractsSchema.parse(req.query);
  const contracts = await contractsService.listContracts(companyId);
  const isAdmin = req.user?.isAdmin === true;
  const permissions = req.user?.permissions ?? [];
  const canReadValues = isAdmin || permissions.includes(PERMISSIONS.CONTRACT_VALUES_READ);

  res.status(200).json(
    contracts.map((contract) => ({
      ...contract,
      value: canReadValues ? contract.value : null
    }))
  );
}

export async function createContract(req: Request, res: Response): Promise<void> {
  const payload = createContractSchema.parse(req.body);
  const contract = await contractsService.createContract(req.user!.id, payload);
  res.status(201).json(contract);
}
