// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {IMoonLandRegistry} from "./interfaces/IMoonLandRegistry.sol";

/// @title MoonMarketplace
/// @notice Pricing, primary acquisition, ERC-4907 rentals and the secondary
///         market for LunarLease lunar sectors.
/// @dev Holds every wei of POL in the system. All payouts are pull-based:
///      nothing is pushed to a seller, owner or payer during acquisition,
///      rental or sale, so a hostile recipient can never block another user's
///      transaction. Not upgradeable.
contract MoonMarketplace is AccessControl, ReentrancyGuard {
    /// @notice Role allowed to move accumulated platform fees out of the contract.
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    /// @notice Basis-point denominator used for the platform fee.
    uint16 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Hard ceiling on the platform fee, enforced on every fee update.
    uint16 public constant MAX_PLATFORM_FEE_BPS = 1_000;
    /// @notice Shortest rental, in days.
    uint64 public constant MIN_RENTAL_DAYS = 1;
    /// @notice Longest rental, in days.
    uint64 public constant MAX_RENTAL_DAYS = 365;
    /// @notice Seconds in a rental day.
    uint64 public constant SECONDS_PER_DAY = 86_400;

    /// @notice Aggregated per-sector state, so the frontend needs one call per sector.
    struct SectorView {
        uint256 sectorId;
        bool minted;
        address owner;
        address user;
        uint64 userExpires;
        bool rentEnabled;
        uint256 pricePerDay;
        bool saleEnabled;
        uint256 salePrice;
    }

    struct SectorConfig {
        bool rentEnabled;
        bool saleEnabled;
        uint256 pricePerDay;
        uint256 salePrice;
    }

    /// @notice The sector registry this marketplace settles against.
    IMoonLandRegistry public immutable registry;

    /// @notice Price of an unclaimed sector on the primary market, in wei.
    uint256 public initialSectorPrice;
    /// @notice Platform fee applied to rentals and secondary sales, in basis points.
    uint16 public platformFeeBps;
    /// @notice Fees accrued to the platform and not yet withdrawn, in wei.
    uint256 public platformBalance;

    /// @notice Withdrawable balance of an account, in wei.
    mapping(address account => uint256 amount) public claimableBalance;

    mapping(uint256 sectorId => SectorConfig config) private _configs;

    /// @notice Emitted on a successful primary acquisition.
    event SectorAcquired(uint256 indexed sectorId, address indexed owner, uint256 price);
    /// @notice Emitted when a sector owner changes the daily rental price.
    event RentalPriceChanged(uint256 indexed sectorId, uint256 pricePerDay);
    /// @notice Emitted when a sector owner opens or closes the sector to renters.
    event RentAvailabilityChanged(uint256 indexed sectorId, bool enabled);
    /// @notice Emitted on a successful rental.
    event SectorRented(uint256 indexed sectorId, address indexed renter, uint64 expiresAt, uint256 totalPrice);
    /// @notice Emitted when a sector is listed on the secondary market.
    event SectorListed(uint256 indexed sectorId, uint256 price);
    /// @notice Emitted when a listing is withdrawn by its owner.
    event SectorListingCancelled(uint256 indexed sectorId);
    /// @notice Emitted on a successful secondary sale.
    event SectorSold(uint256 indexed sectorId, address indexed seller, address indexed buyer, uint256 price);
    /// @notice Emitted when an account pulls its accrued balance.
    event RentalIncomeWithdrawn(address indexed account, uint256 amount);
    /// @notice Emitted when the treasury pulls platform fees.
    event PlatformFundsWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when the admin repriced the primary market.
    event InitialSectorPriceChanged(uint256 newPrice);
    /// @notice Emitted when the admin changed the platform fee.
    event PlatformFeeBpsChanged(uint16 newFeeBps);

    /// @notice Thrown when a sector id falls outside the lunar grid.
    error InvalidSector(uint256 sectorId);
    /// @notice Thrown when acquiring a sector that has already been minted.
    error SectorAlreadyClaimed(uint256 sectorId);
    /// @notice Thrown when acting on a sector that does not exist yet.
    error SectorNotMinted(uint256 sectorId);
    /// @notice Thrown when `msg.value` does not cover the required amount.
    error InsufficientPayment(uint256 required, uint256 provided);
    /// @notice Thrown when the caller is not the ERC-721 owner of the sector.
    error NotSectorOwner(uint256 sectorId, address caller);
    /// @notice Thrown when renting a sector its owner has not opened to renters.
    error RentNotEnabled(uint256 sectorId);
    /// @notice Thrown when renting a sector whose usage rights are still held.
    error AlreadyRented(uint256 sectorId);
    /// @notice Thrown when `numberOfDays` falls outside `[1, 365]`.
    error InvalidDuration(uint64 numberOfDays);
    /// @notice Thrown when the sector owner tries to rent their own sector.
    error CannotRentOwnSector(uint256 sectorId);
    /// @notice Thrown when buying a sector that is not listed for sale.
    error NotListed(uint256 sectorId);
    /// @notice Thrown when the sector owner tries to buy their own listing.
    error CannotBuyOwnSector(uint256 sectorId);
    /// @notice Thrown when a sale is attempted while usage rights are still held.
    error SectorCurrentlyRented(uint256 sectorId);
    /// @notice Thrown when a withdrawal is attempted with an empty balance.
    error NothingToWithdraw();
    /// @notice Thrown when the treasury withdraws more than the accrued fees.
    error InsufficientPlatformBalance(uint256 requested, uint256 available);
    /// @notice Thrown when a fee above `MAX_PLATFORM_FEE_BPS` is proposed.
    error FeeTooHigh(uint16 requested, uint16 maximum);
    /// @notice Thrown when the zero address is supplied where a real account is required.
    error ZeroAddress();

    /// @param registry_ Address of the deployed `MoonLandRegistry`.
    /// @param initialSectorPrice_ Primary-market price of a sector, in wei.
    /// @param platformFeeBps_ Platform fee in basis points, at most 1000.
    /// @param admin Account receiving `DEFAULT_ADMIN_ROLE` and `TREASURY_ROLE`.
    constructor(address registry_, uint256 initialSectorPrice_, uint16 platformFeeBps_, address admin) {
        if (registry_ == address(0) || admin == address(0)) revert ZeroAddress();
        if (platformFeeBps_ > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh(platformFeeBps_, MAX_PLATFORM_FEE_BPS);

        registry = IMoonLandRegistry(registry_);
        initialSectorPrice = initialSectorPrice_;
        platformFeeBps = platformFeeBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
    }

    /// @notice Claims an unowned sector on the primary market.
    /// @dev Proceeds accrue to `platformBalance`; any overpayment accrues to the
    ///      caller's `claimableBalance` instead of being refunded inline.
    /// @param sectorId The sector to claim.
    function acquireSector(uint256 sectorId) external payable nonReentrant {
        if (!registry.isValidSector(sectorId)) revert InvalidSector(sectorId);
        if (registry.exists(sectorId)) revert SectorAlreadyClaimed(sectorId);

        uint256 price = initialSectorPrice;
        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        platformBalance += price;
        _creditOverpayment(price);

        emit SectorAcquired(sectorId, msg.sender, price);

        registry.mintSector(sectorId, msg.sender);
    }

    /// @notice Sets the daily rental price of a sector.
    /// @param sectorId The sector to reprice.
    /// @param pricePerDay Price for one day of usage rights, in wei.
    function setRentalPrice(uint256 sectorId, uint256 pricePerDay) external {
        _requireSectorOwner(sectorId);

        _configs[sectorId].pricePerDay = pricePerDay;

        emit RentalPriceChanged(sectorId, pricePerDay);
    }

    /// @notice Opens or closes a sector to renters.
    /// @param sectorId The sector to update.
    /// @param enabled True to accept rentals.
    function setRentEnabled(uint256 sectorId, bool enabled) external {
        _requireSectorOwner(sectorId);

        _configs[sectorId].rentEnabled = enabled;

        emit RentAvailabilityChanged(sectorId, enabled);
    }

    /// @notice Rents usage rights over a sector for a whole number of days.
    /// @dev The owner's share and any overpayment accrue as claimable balances;
    ///      only the ERC-4907 assignment leaves this contract.
    /// @param sectorId The sector to rent.
    /// @param numberOfDays Rental length in days, within `[1, 365]`.
    function rentSector(uint256 sectorId, uint64 numberOfDays) external payable nonReentrant {
        if (!registry.exists(sectorId)) revert SectorNotMinted(sectorId);
        if (numberOfDays < MIN_RENTAL_DAYS || numberOfDays > MAX_RENTAL_DAYS) revert InvalidDuration(numberOfDays);

        SectorConfig storage config = _configs[sectorId];
        if (!config.rentEnabled) revert RentNotEnabled(sectorId);

        address owner = registry.ownerOf(sectorId);
        if (owner == msg.sender) revert CannotRentOwnSector(sectorId);
        if (registry.userExpires(sectorId) >= block.timestamp) revert AlreadyRented(sectorId);

        uint256 totalPrice = config.pricePerDay * numberOfDays;
        if (msg.value < totalPrice) revert InsufficientPayment(totalPrice, msg.value);

        uint64 expiresAt = uint64(block.timestamp) + numberOfDays * SECONDS_PER_DAY;

        _splitProceeds(owner, totalPrice);
        _creditOverpayment(totalPrice);

        emit SectorRented(sectorId, msg.sender, expiresAt, totalPrice);

        registry.setUser(sectorId, msg.sender, expiresAt);
    }

    /// @notice Lists a sector on the secondary market.
    /// @param sectorId The sector to list.
    /// @param price Sale price, in wei.
    function listForSale(uint256 sectorId, uint256 price) external {
        _requireSectorOwner(sectorId);

        SectorConfig storage config = _configs[sectorId];
        config.saleEnabled = true;
        config.salePrice = price;

        emit SectorListed(sectorId, price);
    }

    /// @notice Withdraws a listing from the secondary market.
    /// @param sectorId The listed sector.
    function cancelListing(uint256 sectorId) external {
        _requireSectorOwner(sectorId);

        SectorConfig storage config = _configs[sectorId];
        if (!config.saleEnabled) revert NotListed(sectorId);

        config.saleEnabled = false;
        config.salePrice = 0;

        emit SectorListingCancelled(sectorId);
    }

    /// @notice Buys a listed sector.
    /// @dev Refused while usage rights are still held, so a sale never carries
    ///      an active rental across an ownership change.
    /// @param sectorId The listed sector to buy.
    function buyListedSector(uint256 sectorId) external payable nonReentrant {
        SectorConfig storage config = _configs[sectorId];
        if (!config.saleEnabled) revert NotListed(sectorId);

        address seller = registry.ownerOf(sectorId);
        if (seller == msg.sender) revert CannotBuyOwnSector(sectorId);
        if (registry.userExpires(sectorId) >= block.timestamp) revert SectorCurrentlyRented(sectorId);

        uint256 price = config.salePrice;
        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        config.saleEnabled = false;
        config.salePrice = 0;

        _splitProceeds(seller, price);
        _creditOverpayment(price);

        emit SectorSold(sectorId, seller, msg.sender, price);

        registry.marketplaceTransfer(sectorId, seller, msg.sender);
    }

    /// @notice Pulls the caller's accrued rental income, sale proceeds and refunds.
    function withdrawRentalIncome() external nonReentrant {
        uint256 amount = claimableBalance[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        claimableBalance[msg.sender] = 0;

        emit RentalIncomeWithdrawn(msg.sender, amount);

        Address.sendValue(payable(msg.sender), amount);
    }

    /// @notice Pulls accrued platform fees to `to`.
    /// @param to Recipient of the fees.
    /// @param amount Amount to withdraw, in wei.
    function withdrawPlatformFunds(address to, uint256 amount) external nonReentrant onlyRole(TREASURY_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert NothingToWithdraw();

        uint256 available = platformBalance;
        if (amount > available) revert InsufficientPlatformBalance(amount, available);

        platformBalance = available - amount;

        emit PlatformFundsWithdrawn(to, amount);

        Address.sendValue(payable(to), amount);
    }

    /// @notice Reprices the primary market.
    /// @param newPrice New price of an unclaimed sector, in wei.
    function setInitialSectorPrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        initialSectorPrice = newPrice;

        emit InitialSectorPriceChanged(newPrice);
    }

    /// @notice Changes the platform fee applied to rentals and secondary sales.
    /// @param newFeeBps New fee in basis points, at most `MAX_PLATFORM_FEE_BPS`.
    function setPlatformFeeBps(uint16 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_PLATFORM_FEE_BPS);

        platformFeeBps = newFeeBps;

        emit PlatformFeeBpsChanged(newFeeBps);
    }

    /// @notice Aggregated on-chain state of a single sector.
    /// @param sectorId The sector to read.
    /// @return The sector's ownership, rental and listing state.
    function getSector(uint256 sectorId) public view returns (SectorView memory) {
        SectorConfig storage config = _configs[sectorId];
        bool minted = registry.exists(sectorId);

        return SectorView({
            sectorId: sectorId,
            minted: minted,
            owner: minted ? registry.ownerOf(sectorId) : address(0),
            user: registry.userOf(sectorId),
            userExpires: uint64(registry.userExpires(sectorId)),
            rentEnabled: config.rentEnabled,
            pricePerDay: config.pricePerDay,
            saleEnabled: config.saleEnabled,
            salePrice: config.salePrice
        });
    }

    /// @notice Aggregated on-chain state of many sectors in one call.
    /// @param sectorIds The sectors to read.
    /// @return views One entry per requested sector, in the same order.
    function getSectors(uint256[] calldata sectorIds) external view returns (SectorView[] memory views) {
        views = new SectorView[](sectorIds.length);

        for (uint256 i = 0; i < sectorIds.length; ++i) {
            views[i] = getSector(sectorIds[i]);
        }
    }

    function _requireSectorOwner(uint256 sectorId) private view {
        if (!registry.exists(sectorId)) revert SectorNotMinted(sectorId);
        if (registry.ownerOf(sectorId) != msg.sender) revert NotSectorOwner(sectorId, msg.sender);
    }

    function _splitProceeds(address beneficiary, uint256 total) private {
        uint256 fee = (total * platformFeeBps) / BPS_DENOMINATOR;

        platformBalance += fee;
        claimableBalance[beneficiary] += total - fee;
    }

    function _creditOverpayment(uint256 charged) private {
        uint256 overpayment = msg.value - charged;
        if (overpayment != 0) claimableBalance[msg.sender] += overpayment;
    }
}
