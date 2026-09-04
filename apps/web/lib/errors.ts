import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { ConnectorAlreadyConnectedError, ProviderNotFoundError } from "wagmi";

export function isAlreadyConnectedError(error: unknown): boolean {
  if (error instanceof ConnectorAlreadyConnectedError) return true;
  return error instanceof Error && /already connected/i.test(error.message);
}

const revertMessages: Record<string, string> = {
  InvalidSector: "That sector id is outside the lunar grid.",
  SectorAlreadyClaimed: "This sector has already been claimed.",
  SectorAlreadyMinted: "This sector has already been minted.",
  InsufficientPayment: "The amount sent is below the required price.",
  SectorNotMinted: "This sector has not been claimed yet.",
  RentNotEnabled: "The owner has not enabled renting for this sector.",
  AlreadyRented: "This sector is already rented for the current period.",
  InvalidDuration: "Rental duration must be between 1 and 365 days.",
  CannotRentOwnSector: "You already own this sector.",
  NotListed: "This sector is not listed for sale.",
  CannotBuyOwnSector: "You already own this sector.",
  SectorCurrentlyRented: "This sector cannot be sold while a rental is active.",
  NotSectorOwner: "Only the sector owner can do that.",
  NothingToWithdraw: "There is no claimable balance to withdraw.",
};

export function describeTransactionError(error: unknown): string {
  if (error === null || error === undefined) return "Unknown error.";

  if (error instanceof ProviderNotFoundError) {
    return "No browser wallet detected. Install MetaMask (or another injected wallet) and reload this page.";
  }

  if (isAlreadyConnectedError(error)) {
    return "This wallet is already connected. Disconnect first, or switch account in MetaMask.";
  }

  if (error instanceof BaseError) {
    const rejection = error.walk((inner) => inner instanceof UserRejectedRequestError);
    if (rejection instanceof UserRejectedRequestError) {
      return "Transaction rejected in your wallet.";
    }

    const reverted = error.walk((inner) => inner instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const errorName = reverted.data?.errorName;
      if (errorName !== undefined) {
        const friendly = revertMessages[errorName];
        return friendly ?? `Reverted with ${errorName}.`;
      }
      return reverted.reason ?? reverted.shortMessage;
    }

    return error.shortMessage;
  }

  if (error instanceof Error) return error.message;
  return "Unknown error.";
}
