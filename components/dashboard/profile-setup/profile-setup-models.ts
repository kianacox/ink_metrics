import type {
  RentFrequency,
  RentType,
} from "@/lib/profiles/profile-setup";

export type ChairRentChoice = boolean | null;
export type CappedChoice = boolean | null;

export type MobileStepKey = "identity" | "chairRent" | "rentType" | "rentDetails";

export interface ProfileSetupFlowProps {
  initialCurrency: string;
}

export interface ProfileSetupCandidate {
  displayName: string;
  defaultCurrency: string;
  payChairRent: boolean | null;
  rentType: RentType | null;
  fixedFrequency: RentFrequency | null;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: RentFrequency | null;
  commissionCapAmountMinor: number | null;
}

export const MOBILE_STEPS: MobileStepKey[] = [
  "identity",
  "chairRent",
  "rentType",
  "rentDetails",
];

export interface ChoiceButtonProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}
