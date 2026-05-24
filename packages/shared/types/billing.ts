export interface UpgradeSessionResponse {
  checkoutUrl: string;
}

export interface DraftLimitError {
  code: "DRAFT_LIMIT_REACHED";
  message: string;
  upgradeUrl: string;
}
