// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IERC4907
/// @notice Rental NFT extension: a token has an owner and, optionally, a
///         time-limited `user` that holds usage rights without ownership.
/// @dev Interface id: 0xad092b5c.
interface IERC4907 {
    /// @notice Emitted when the user of a token or the expiry of that user changes.
    /// @param tokenId The token whose user changed.
    /// @param user The new user, or the zero address when usage rights are cleared.
    /// @param expires UNIX timestamp at which the usage rights lapse.
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);

    /// @notice Grants usage rights over `tokenId` to `user` until `expires`.
    /// @param tokenId The token to assign.
    /// @param user The address receiving usage rights.
    /// @param expires UNIX timestamp at which the usage rights lapse.
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    /// @notice Returns the current user of `tokenId`, or the zero address when
    ///         no active usage right exists.
    /// @param tokenId The token to query.
    /// @return The active user, or the zero address.
    function userOf(uint256 tokenId) external view returns (address);

    /// @notice Returns the raw expiry timestamp stored for `tokenId`.
    /// @param tokenId The token to query.
    /// @return UNIX timestamp at which usage rights lapse; zero when never set.
    function userExpires(uint256 tokenId) external view returns (uint256);
}
