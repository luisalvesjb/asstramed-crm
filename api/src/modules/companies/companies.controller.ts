import { Request, Response } from "express";
import {
  addCompanyContactSchema,
  createCompanySchema,
  listCompaniesSchema,
  replaceCompanyContactsSchema,
  updateCompanySchema,
  upsertCompanyAddressSchema,
  upsertCompanyPersonalInfoSchema
} from "./companies.validators";
import * as companiesService from "./companies.service";
import { PERMISSIONS } from "../../config/permissions";

export async function listCompanies(req: Request, res: Response): Promise<void> {
  const filters = listCompaniesSchema.parse(req.query);
  const companies = await companiesService.listCompanies(filters);
  res.status(200).json(companies);
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  const payload = createCompanySchema.parse(req.body);
  const company = await companiesService.createCompany(req.user!.id, payload);
  res.status(201).json(company);
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  const payload = updateCompanySchema.parse(req.body);
  const company = await companiesService.updateCompany(req.user!.id, req.params.id, payload);
  res.status(200).json(company);
}

export async function getCompanyById(req: Request, res: Response): Promise<void> {
  const isAdmin = req.user?.isAdmin === true;
  const permissions = req.user?.permissions ?? [];

  const company = await companiesService.getCompanyByIdWithAccess(req.params.id, {
    canReadDocuments: isAdmin || permissions.includes(PERMISSIONS.DOCUMENTS_READ),
    canReadContracts: isAdmin || permissions.includes(PERMISSIONS.CONTRACTS_READ),
    canReadContractValues: isAdmin || permissions.includes(PERMISSIONS.CONTRACT_VALUES_READ)
  });

  res.status(200).json(company);
}

export async function addCompanyContact(req: Request, res: Response): Promise<void> {
  const payload = addCompanyContactSchema.parse(req.body);
  const contact = await companiesService.addCompanyContact(req.user!.id, req.params.id, payload);
  res.status(201).json(contact);
}

export async function replaceCompanyContacts(req: Request, res: Response): Promise<void> {
  const payload = replaceCompanyContactsSchema.parse(req.body);
  const contacts = await companiesService.replaceCompanyContacts(req.user!.id, req.params.id, payload.contacts);
  res.status(200).json(contacts);
}

export async function upsertCompanyAddress(req: Request, res: Response): Promise<void> {
  const payload = upsertCompanyAddressSchema.parse(req.body);
  const address = await companiesService.upsertCompanyAddress(req.user!.id, req.params.id, payload);
  res.status(200).json(address);
}

export async function upsertCompanyPersonalInfo(req: Request, res: Response): Promise<void> {
  const payload = upsertCompanyPersonalInfoSchema.parse(req.body);
  const company = await companiesService.upsertCompanyPersonalInfo(req.user!.id, req.params.id, {
    ...payload,
    logo: req.file ?? undefined
  });

  res.status(200).json(company);
}
