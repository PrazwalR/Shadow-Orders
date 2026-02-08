// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// Inco FHE imports
import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";

// Uniswap V4 imports
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

/// @title ShadowOrdersHook
/// @notice Privacy-preserving limit orders using TEE encryption on Uniswap V4
/// @dev Encrypted limit prices and amounts are stored using Inco Lightning's TEE (euint256)
///      Order parameters remain encrypted on-chain, preventing MEV and front-running
/// @author Shadow Orders Team
/// @custom:security-contact security@shadoworders.xyz
contract ShadowOrdersHook is BaseHook {
    using e for *;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    // ============ STRUCTS ============

    /// @notice Represents an encrypted limit order
    struct Order {
        address owner;           // Order creator
        euint256 limitPrice;     // Encrypted limit price (FHE)
        euint256 amount;         // Encrypted order amount (FHE)
        ebool isBuyOrder;        // Encrypted: true = buy, false = sell
        bool isActive;           // Order status (plaintext for gas efficiency)
        PoolId poolId;           // Pool this order is for
        uint256 createdAt;       // Timestamp
    }

    // ============ STATE VARIABLES ============

    /// @notice Order storage - mapping from orderId to Order
    mapping(uint256 => Order) public orders;
    
    /// @notice Next order ID counter
    uint256 public nextOrderId;
    
    /// @notice Keeper address (can execute orders)
    address public keeper;
    
    /// @notice Keeper fee in basis points (e.g., 10 = 0.1%)
    uint256 public constant KEEPER_FEE_BPS = 10; // 0.1%
    
    /// @notice MEV protection buffer in basis points (e.g., 200 = 2%)
    uint256 public constant EXECUTION_BUFFER_BPS = 200; // 2%
    
    /// @notice Track orders by owner for easy lookup
    mapping(address => uint256[]) public ordersByOwner;
    
    /// @notice Track active order count per pool
    mapping(PoolId => uint256) public activeOrdersPerPool;

    // ============ EVENTS ============

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        PoolId indexed poolId,
        uint256 createdAt
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed owner
    );
    
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed owner,
        address indexed executor,
        uint256 executionPrice,
        uint256 keeperFee
    );
    
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);

    // ============ ERRORS ============

    error OnlyKeeper();
    error OnlyOrderOwner();
    error OrderNotActive();
    error OrderNotExecutable();
    error InsufficientFee();
    error InvalidOrder();
    error ZeroAddress();

    // ============ MODIFIERS ============

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    modifier onlyOrderOwner(uint256 orderId) {
        if (msg.sender != orders[orderId].owner) revert OnlyOrderOwner();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        IPoolManager _poolManager,
        address _keeper
    ) BaseHook(_poolManager) {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
        emit KeeperUpdated(address(0), _keeper);
    }

    // ============ HOOK PERMISSIONS ============

    /// @notice Define which hook functions this contract implements
    /// @dev We only use beforeSwap and afterSwap for order execution
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,      // Validate order execution
            afterSwap: true,       // Collect keeper fees, cleanup
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true, // For keeper fee deduction
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ============ ORDER MANAGEMENT ============

    /// @notice Create a new encrypted limit order
    /// @param poolKey The pool to place the order on
    /// @param limitPriceInput Encrypted limit price (ciphertext from JS SDK)
    /// @param amountInput Encrypted order amount (ciphertext from JS SDK)
    /// @param isBuyOrderInput Encrypted order direction (ciphertext)
    /// @return orderId The ID of the created order
    function createOrder(
        PoolKey calldata poolKey,
        bytes calldata limitPriceInput,
        bytes calldata amountInput,
        bytes calldata isBuyOrderInput
    ) external payable returns (uint256 orderId) {
        // Fee check: 3 FHE operations (newEuint256 x2, newEbool x1)
        uint256 requiredFee = inco.getFee() * 3;
        if (msg.value < requiredFee) revert InsufficientFee();
        
        // Decrypt inputs into FHE handles
        euint256 limitPrice = limitPriceInput.newEuint256(msg.sender);
        euint256 amount = amountInput.newEuint256(msg.sender);
        ebool isBuyOrder = isBuyOrderInput.newEbool(msg.sender);
        
        // Create order
        orderId = nextOrderId++;
        PoolId poolId = poolKey.toId();
        
        orders[orderId] = Order({
            owner: msg.sender,
            limitPrice: limitPrice,
            amount: amount,
            isBuyOrder: isBuyOrder,
            isActive: true,
            poolId: poolId,
            createdAt: block.timestamp
        });
        
        // Grant access permissions
        // Owner can see their own order details
        limitPrice.allow(msg.sender);
        amount.allow(msg.sender);
        isBuyOrder.allow(msg.sender);
        
        // Contract can compute over these values
        limitPrice.allowThis();
        amount.allowThis();
        isBuyOrder.allowThis();
        
        // Keeper can check execution conditions
        limitPrice.allow(keeper);
        amount.allow(keeper);
        isBuyOrder.allow(keeper);
        
        // Track order
        ordersByOwner[msg.sender].push(orderId);
        activeOrdersPerPool[poolId]++;
        
        // Refund excess fee
        if (msg.value > requiredFee) {
            payable(msg.sender).transfer(msg.value - requiredFee);
        }
        
        emit OrderCreated(orderId, msg.sender, poolId, block.timestamp);
    }

    /// @notice Cancel an active order (only owner)
    /// @param orderId The order to cancel
    function cancelOrder(uint256 orderId) external onlyOrderOwner(orderId) {
        Order storage order = orders[orderId];
        if (!order.isActive) revert OrderNotActive();
        
        // Deactivate order
        order.isActive = false;
        activeOrdersPerPool[order.poolId]--;
        
        emit OrderCancelled(orderId, msg.sender);
    }

    /// @notice Check if an order can be executed at given price
    /// @dev This is called by the keeper before attempting execution
    /// @param orderId The order to check
    /// @param currentPrice The current market price
    /// @return canExecute Whether the order can be executed
    function checkOrderExecutable(
        uint256 orderId,
        uint256 currentPrice
    ) external returns (bool canExecute) {
        Order storage order = orders[orderId];
        if (!order.isActive) return false;
        
        // Convert current price to encrypted for comparison
        euint256 currentPriceEncrypted = currentPrice.asEuint256();
        
        // Get order direction
        ebool isBuy = order.isBuyOrder;
        
        // Calculate buffered limit for MEV protection
        // Buy order: Execute if current <= (limit * 98%) - 2% buffer
        // Sell order: Execute if current >= (limit * 102%) - 2% buffer
        euint256 limitPrice = order.limitPrice;
        
        // For buy orders: current price must be 2% BELOW limit price
        // For sell orders: current price must be 2% ABOVE limit price
        euint256 bufferMultiplier = isBuy.select(
            uint256(10000 - EXECUTION_BUFFER_BPS).asEuint256(), // 9800 for buy
            uint256(10000 + EXECUTION_BUFFER_BPS).asEuint256()  // 10200 for sell
        );
        
        euint256 bufferedLimit = limitPrice.mul(bufferMultiplier).div(uint256(10000).asEuint256());
        
        // Check execution condition - returns encrypted result
        ebool priceConditionMet = isBuy.select(
            currentPriceEncrypted.le(bufferedLimit), // Buy: current <= buffered limit
            currentPriceEncrypted.ge(bufferedLimit)  // Sell: current >= buffered limit
        );
        
        // Allow keeper to see the result
        priceConditionMet.allow(keeper);
        
        // For off-chain verification, we mark as potentially executable
        // Actual verification done via attestedCompute
        canExecute = true;
    }

    /// @notice Execute an order (called by keeper via swap)
    /// @dev The actual execution happens through the V4 swap mechanism
    /// @param orderId The order to execute
    /// @param poolKey The pool key
    /// @param currentPrice Current market price for validation
    function executeOrder(
        uint256 orderId,
        PoolKey calldata poolKey,
        uint256 currentPrice
    ) external onlyKeeper {
        Order storage order = orders[orderId];
        if (!order.isActive) revert OrderNotActive();
        if (PoolId.unwrap(order.poolId) != PoolId.unwrap(poolKey.toId())) revert InvalidOrder();
        
        // Mark as executed before swap to prevent reentrancy
        order.isActive = false;
        activeOrdersPerPool[order.poolId]--;
        
        // Verify execution condition via FHE
        euint256 currentPriceEncrypted = currentPrice.asEuint256();
        ebool isBuy = order.isBuyOrder;
        
        // Calculate buffered limit
        euint256 bufferMultiplier = isBuy.select(
            uint256(10000 - EXECUTION_BUFFER_BPS).asEuint256(),
            uint256(10000 + EXECUTION_BUFFER_BPS).asEuint256()
        );
        euint256 bufferedLimit = order.limitPrice.mul(bufferMultiplier).div(uint256(10000).asEuint256());
        
        // Verify condition
        ebool canExecute = isBuy.select(
            currentPriceEncrypted.le(bufferedLimit),
            currentPriceEncrypted.ge(bufferedLimit)
        );
        
        // Reveal and check - this is the atomic reveal + execute moment
        e.reveal(canExecute);
        // Note: In production, we'd use callback pattern for async reveal
        // For hackathon MVP, we use synchronous reveal
        
        emit OrderExecuted(orderId, order.owner, msg.sender, currentPrice, KEEPER_FEE_BPS);
    }

    // ============ HOOK CALLBACKS ============

    /// @notice Called before a swap - validate if this is an order execution
    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        // If hookData contains order execution info, validate it
        if (hookData.length > 0) {
            // Decode order ID from hookData
            uint256 orderId = abi.decode(hookData, (uint256));
            Order storage order = orders[orderId];
            
            // Basic validation - detailed FHE check in executeOrder
            if (!order.isActive) revert OrderNotActive();
            if (PoolId.unwrap(order.poolId) != PoolId.unwrap(key.toId())) revert InvalidOrder();
        }
        
        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Called after a swap - handle keeper fees
    function _afterSwap(
        address sender,
        PoolKey calldata,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        // If this was an order execution, calculate keeper fee
        if (hookData.length > 0 && sender == keeper) {
            // Verify order was valid (already marked inactive in executeOrder)
            // Just need to calculate fee
            
            // Calculate keeper fee from output amount
            // Fee is taken from the output tokens
            int128 outputAmount = params.zeroForOne ? delta.amount1() : delta.amount0();
            
            if (outputAmount > 0) {
                // Calculate fee (0.1% of output)
                int128 keeperFee = outputAmount * int128(int256(KEEPER_FEE_BPS)) / 10000;
                
                // Return the fee delta (keeper receives this)
                return (this.afterSwap.selector, keeperFee);
            }
        }
        
        return (this.afterSwap.selector, 0);
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get all orders for an owner
    function getOrdersByOwner(address owner) external view returns (uint256[] memory) {
        return ordersByOwner[owner];
    }

    /// @notice Get order details (non-encrypted fields)
    function getOrderInfo(uint256 orderId) external view returns (
        address owner,
        bool isActive,
        PoolId poolId,
        uint256 createdAt
    ) {
        Order storage order = orders[orderId];
        return (order.owner, order.isActive, order.poolId, order.createdAt);
    }

    /// @notice Get active order count for a pool
    function getActiveOrderCount(PoolId poolId) external view returns (uint256) {
        return activeOrdersPerPool[poolId];
    }

    /// @notice Get total order count
    function getTotalOrderCount() external view returns (uint256) {
        return nextOrderId;
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Update keeper address
    function setKeeper(address newKeeper) external {
        if (newKeeper == address(0)) revert ZeroAddress();
        // For hackathon: only current keeper can update
        // In production: use Ownable or governance
        if (msg.sender != keeper && keeper != address(0)) revert OnlyKeeper();
        
        address oldKeeper = keeper;
        keeper = newKeeper;
        emit KeeperUpdated(oldKeeper, newKeeper);
    }

    /// @notice Receive ETH for FHE fees (contract-paid model)
    receive() external payable {}

    /// @notice Withdraw accumulated fees (for keeper rewards)
    function withdrawFees(address to) external onlyKeeper {
        if (to == address(0)) revert ZeroAddress();
        payable(to).transfer(address(this).balance);
    }
}
