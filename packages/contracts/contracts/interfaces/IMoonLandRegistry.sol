// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IERC4907} from "./IERC4907.sol";

/// @title IMoonLandRegistry
/// @notice The ownership and usage-rights surface of the LunarLease sector
///         registry, as consumed by `MoonMarketplace` and off-chain clients.
interface IMoonLandRegistry is IERC721, IERC4907 {
    /// @notice Total number of lunar sectors that can ever exist.
    /// @return The fixed sector supply (2592).
    function TOTAL_SECTORS() external view returns (uint256);

    /// @notice Whether `sectorId` has been minted.
    /// @param sectorId The sector to query.
    /// @return True when a token exists for `sectorId`.
    function exists(uint256 sectorId) external view returns (bool);

    /// @notice Whether `sectorId` is inside the addressable lunar grid.
    /// @param sectorId The sector to query.
    /// @return True when `sectorId < TOTAL_SECTORS`.
    function isValidSector(uint256 sectorId) external pure returns (bool);

    /// @notice Mints `sectorId` to `to`. Restricted to `MARKETPLACE_ROLE`.
    /// @param sectorId The sector to mint.
    /// @param to The recipient of the newly minted sector.
    function mintSector(uint256 sectorId, address to) external;

    /// @notice Settles a marketplace sale by moving `sectorId` from `from` to `to`.
    ///         Restricted to `MARKETPLACE_ROLE`.
    /// @param sectorId The sector to move.
    /// @param from The current owner.
    /// @param to The buyer.
    function marketplaceTransfer(uint256 sectorId, address from, address to) external;

    /// @notice An anonymous holding period over one sector. A zero `expiry`
    ///         means open-ended, which is how ownership is recorded; a non-zero
    ///         `expiry` is a rental window.
    struct OwnershipPeriod {
        uint64 start;
        uint64 expiry;
    }

    /// @notice Drops every elapsed period of `holder`. Open-ended ownership
    ///         periods are never pruned.
    /// @param holder The account whose periods are pruned.
    function cleanExpiredPeriods(address holder) external;

    /// @notice Every period currently recorded for `holder`, owned and rented alike.
    /// @param holder The account to query.
    /// @return The account's periods, in storage order.
    function getOwnershipPeriods(address holder) external view returns (OwnershipPeriod[] memory);
}
