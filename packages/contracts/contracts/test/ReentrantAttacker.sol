// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MoonMarketplace} from "../MoonMarketplace.sol";

/// @title ReentrantAttacker
/// @notice Test-only receiver that re-enters `withdrawRentalIncome` from its
///         `receive` hook to prove the pull-payment path cannot be drained.
/// @dev Never deployed outside the test suite.
contract ReentrantAttacker {
    MoonMarketplace public immutable marketplace;

    /// @notice Number of re-entrancy attempts made from `receive`.
    uint256 public reentryAttempts;
    /// @notice Set once a re-entrant call has been rejected by the marketplace.
    bool public reentryRejected;
    /// @notice When false the re-entrant revert bubbles up and kills the outer call.
    bool public swallowReentryRevert = true;
    /// @notice Upper bound on re-entrancy attempts, so a failing test cannot loop forever.
    uint256 public maxReentryAttempts = 2;

    /// @notice Thrown when the attacker is funded outside of a withdrawal.
    error DirectFundingRejected();

    /// @notice Chooses whether a failed re-entrant call is swallowed or bubbled up.
    /// @param swallow True to catch the revert, false to let it propagate.
    function setSwallowReentryRevert(bool swallow) external {
        swallowReentryRevert = swallow;
    }

    /// @param marketplace_ The marketplace under attack.
    constructor(address marketplace_) {
        marketplace = MoonMarketplace(payable(marketplace_));
    }

    /// @notice Acquires a sector, overpaying so the attacker accrues a claimable balance.
    /// @param sectorId The sector to acquire.
    function acquire(uint256 sectorId) external payable {
        marketplace.popUpBalance{value: msg.value}(address(this));
        marketplace.acquireSector(sectorId);
    }

    /// @notice Starts the attack by pulling the attacker's claimable balance.
    function attack() external {
        marketplace.withdrawRentalIncome();
    }

    /// @notice Accepts sectors minted by the marketplace.
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        if (msg.sender != address(marketplace)) revert DirectFundingRejected();
        if (reentryAttempts >= maxReentryAttempts) return;

        reentryAttempts += 1;

        if (swallowReentryRevert) {
            try marketplace.withdrawRentalIncome() {}
            catch {
                reentryRejected = true;
            }
        } else {
            marketplace.withdrawRentalIncome();
        }
    }
}
