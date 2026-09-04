// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {IERC4907} from "./interfaces/IERC4907.sol";
import {IMoonLandRegistry} from "./interfaces/IMoonLandRegistry.sol";

/// @title MoonLandRegistry
/// @notice ERC-721 registry of the 2592 virtual lunar sectors of LunarLease,
///         extended with ERC-4907 time-limited usage rights.
/// @dev Money and pricing live in `MoonMarketplace`; this contract only tracks
///      ownership and usage rights. Minting, user assignment and sale
///      settlement are restricted to `MARKETPLACE_ROLE`. Not upgradeable.
contract MoonLandRegistry is ERC721, ERC721Enumerable, AccessControl, IMoonLandRegistry {
    /// @notice Role allowed to mint sectors, assign ERC-4907 users and settle sales.
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    uint256 private constant _TOTAL_SECTORS = 2592;
    uint256 private constant _LONGITUDE_BANDS = 72;
    int256 private constant _STEP_DEG = 5;
    int256 private constant _LATITUDE_ORIGIN_DEG = -90;
    int256 private constant _LONGITUDE_ORIGIN_DEG = -180;

    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 sectorId => UserInfo info) private _users;

    /// @notice Thrown when a sector id falls outside the lunar grid.
    error InvalidSector(uint256 sectorId);
    /// @notice Thrown when an operation targets a sector that has not been minted.
    error SectorNotMinted(uint256 sectorId);
    /// @notice Thrown when minting a sector that already exists.
    error SectorAlreadyClaimed(uint256 sectorId);
    /// @notice Thrown when the zero address is supplied where a real account is required.
    error ZeroAddress();

    /// @param admin Account receiving `DEFAULT_ADMIN_ROLE`.
    constructor(address admin) ERC721("LunarLease Moon Sector", "MOON") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @inheritdoc IMoonLandRegistry
    function TOTAL_SECTORS() external pure returns (uint256) {
        return _TOTAL_SECTORS;
    }

    /// @inheritdoc IMoonLandRegistry
    function isValidSector(uint256 sectorId) public pure returns (bool) {
        return sectorId < _TOTAL_SECTORS && sectorId;
    }

    /// @inheritdoc IMoonLandRegistry
    function exists(uint256 sectorId) public view returns (bool) {
        return _ownerOf(sectorId) != address(0);
    }

    /// @inheritdoc IMoonLandRegistry
    function mintSector(uint256 sectorId, address to) external onlyRole(MARKETPLACE_ROLE) {
        if (!isValidSector(sectorId)) revert InvalidSector(sectorId);
        if (exists(sectorId)) revert SectorAlreadyClaimed(sectorId);
        _safeMint(to, sectorId);
    }

    /// @inheritdoc IERC4907
    /// @dev Passing `address(0)` with `expires` zero clears the usage right.
    function setUser(uint256 sectorId, address user, uint64 expires) external onlyRole(MARKETPLACE_ROLE) {
        if (!exists(sectorId)) revert SectorNotMinted(sectorId);
        _users[sectorId] = UserInfo({user: user, expires: expires});
        emit UpdateUser(sectorId, user, expires);
    }

    /// @inheritdoc IMoonLandRegistry
    function marketplaceTransfer(uint256 sectorId, address from, address to) external onlyRole(MARKETPLACE_ROLE) {
        if (!exists(sectorId)) revert SectorNotMinted(sectorId);
        _transfer(from, to, sectorId);
    }

    /// @inheritdoc IERC4907
    /// @dev Derived purely from the stored timestamp, so an elapsed rental needs
    ///      no clearing transaction.
    function userOf(uint256 sectorId) public view returns (address) {
        UserInfo storage info = _users[sectorId];
        if (info.expires > block.timestamp) return info.user;
        return address(0);
    }

    /// @inheritdoc IERC4907
    function userExpires(uint256 sectorId) public view returns (uint256) {
        return _users[sectorId].expires;
    }

    /// @notice ERC-721 metadata as an on-chain `data:` URI.
    /// @dev Contains only immutable, sector-derived facts; ownership and rental
    ///      state are deliberately excluded so metadata never goes stale.
    /// @param sectorId The sector to describe.
    /// @return A base64-encoded `application/json` data URI.
    function tokenURI(uint256 sectorId) public view override returns (string memory) {
        _requireOwned(sectorId);

        uint256 latitudeIndex = sectorId / _LONGITUDE_BANDS;
        uint256 longitudeIndex = sectorId % _LONGITUDE_BANDS;
        int256 latMin = _LATITUDE_ORIGIN_DEG + int256(latitudeIndex) * _STEP_DEG;
        int256 lonMin = _LONGITUDE_ORIGIN_DEG + int256(longitudeIndex) * _STEP_DEG;

        string memory json = string.concat(
            '{"name":"Lunar Sector #',
            Strings.toString(sectorId),
            '","description":"',
            "Virtual lunar sector in LunarLease. Represents virtual ownership within the LunarLease system only; ",
            "it does not confer legally recognized ownership of physical lunar territory.",
            '","attributes":[',
            _attribute("Latitude", _degreeRange(latMin, latMin + _STEP_DEG, "N", "S")),
            ",",
            _attribute("Longitude", _degreeRange(lonMin, lonMin + _STEP_DEG, "E", "W")),
            ",",
            _numericAttribute("Latitude Index", latitudeIndex),
            ",",
            _numericAttribute("Longitude Index", longitudeIndex),
            "]}"
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice ERC-165 support, including ERC-721, ERC-721 Enumerable,
    ///         AccessControl and ERC-4907 (`0xad092b5c`).
    /// @param interfaceId The interface identifier to query.
    /// @return True when the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC4907).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @dev Every ownership change clears the ERC-4907 user so a transferred
    ///      sector never carries an inherited renter.
    function _update(address to, uint256 sectorId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = super._update(to, sectorId, auth);

        if (from != to && _users[sectorId].expires != 0) {
            delete _users[sectorId];
            emit UpdateUser(sectorId, address(0), 0);
        }

        return from;
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function _attribute(string memory traitType, string memory value) private pure returns (string memory) {
        return string.concat('{"trait_type":"', traitType, '","value":"', value, '"}');
    }

    function _numericAttribute(string memory traitType, uint256 value) private pure returns (string memory) {
        return string.concat('{"trait_type":"', traitType, '","value":', Strings.toString(value), "}");
    }

    function _degreeRange(int256 from, int256 to, string memory positive, string memory negative)
        private
        pure
        returns (string memory)
    {
        return string.concat(_degree(from, positive, negative), unicode" – ", _degree(to, positive, negative));
    }

    function _degree(int256 value, string memory positive, string memory negative)
        private
        pure
        returns (string memory)
    {
        if (value == 0) return unicode"0°";
        uint256 magnitude = value > 0 ? uint256(value) : uint256(-value);
        return string.concat(Strings.toString(magnitude), unicode"°", value > 0 ? positive : negative);
    }
}
