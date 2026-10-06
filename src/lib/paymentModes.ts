// Mirrors the backend's `utils/paymentModes.js` — the one place that decides
// which payment modes move a bank balance. Cash does not; Bank, Cheque and UPI
// all do, because all three are money moving through a bank account and this
// project has no cheque-clearance concept that would hold one off the balance.
//
// Every form that offers a payment mode gates its Bank Account field and its
// `bankAccountId` payload on this, so a mode the server debits can never be a
// mode the form forgot to ask about. Keep in step with the backend file.
export const BANK_BACKED_MODES = ["Bank", "Cheque", "UPI"];

export const usesBankAccount = (paymentMode: string) =>
  BANK_BACKED_MODES.includes(paymentMode);
