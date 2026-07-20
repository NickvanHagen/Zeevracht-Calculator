import type { ContainerType as ShipmentContainerType } from './shipment';

export type ContainerType = ShipmentContainerType;
export type FclCarrier = 'jgt';
export type FclTerminal = 'euromax' | 'delta' | 'botlek';
export type FclWeightCategory = 'under18t' | 'over18t';
export type FclVisitSurcharge = 'none' | 'rwg' | 'ectEmxHpd2' | 'quay';
