// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MoonMarketplace} from "../MoonMarketplace.sol";

/// @title ReentrantAttacker
/// @notice Test-only receiver that re-enters `withdrawPlatformFunds` from its
///         `receive` hook to prove the POL payout path cannot be drained.
/// @dev Never deployed outside the test suite.
contract ReentrantAttacker {
    MoonMarketplace public immutable marketplace;

    uint256 public reentryAttempts;
    bool public reentryRejected;
    bool public swallowReentryRevert = true;
    uint256 public maxReentryAttempts = 2;

    error DirectFundingRejected();

    function setSwallowReentryRevert(bool swallow) external {
        swallowReentryRevert = swallow;
    }

    constructor(address marketplace_) {
        marketplace = MoonMarketplace(payable(marketplace_));
    }

    function acquire(uint256 sectorId) external payable {
        marketplace.popUpBalance{value: msg.value}(address(this));
        marketplace.acquireSector(sectorId);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        if (msg.sender != address(marketplace)) revert DirectFundingRejected();
        if (reentryAttempts >= maxReentryAttempts) return;

        reentryAttempts += 1;

        if (swallowReentryRevert) {
            try marketplace.withdrawPlatformFunds(address(this), 1) {}
            catch {
                reentryRejected = true;
            }
        } else {
            marketplace.withdrawPlatformFunds(address(this), 1);
        }
    }
}
