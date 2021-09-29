pragma solidity 0.8.7;

// SPDX-License-Identifier: MIT

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
     * `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    /**
     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
     * with `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Tool to verifies that a low level call was successful, and revert if it wasn't, either by bubbling the
     * revert reason using the provided one.
     *
     * _Available since v4.3._
     */
    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using Address for address;

    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    /**
     * @dev Deprecated. This function has issues similar to the ones found in
     * {IERC20-approve}, and its usage is discouraged.
     *
     * Whenever possible, use {safeIncreaseAllowance} and
     * {safeDecreaseAllowance} instead.
     */
    function safeApprove(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        require(
            (value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender) + value;
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        unchecked {
            uint256 oldAllowance = token.allowance(address(this), spender);
            require(oldAllowance >= value, "SafeERC20: decreased allowance below zero");
            uint256 newAllowance = oldAllowance - value;
            _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) {
            // Return data is optional
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

/**
 * @dev Implementation of the {IERC20} interface.
 */
contract ERC20 is Context, IERC20 {
    mapping(address => uint256) internal _balances;

    mapping(address => mapping(address => uint256)) internal _allowances;

    uint256 internal _totalSupply;

    string public name;
    string public symbol;
    uint8 public decimals;

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}

abstract contract Timestamp {
    function _blockTimestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}

abstract contract IGainBase is ERC20, Timestamp {
    using SafeERC20 for IERC20;

    bool public canBuy;

    address public treasury;
    address public baseToken;

    uint256 public openTime;
    uint256 public closeTime;

    uint256 public constant protocolFee = 0.01e18;
    uint256 public constant minFee = 0.003e18;
    uint256 public constant maxFee = 0.03e18;


    // a + b = $1
    // b = the synth
    // a = 1 - b
    uint256 public bPrice;

    uint256 public poolA;
    uint256 public poolB;

    mapping(address => uint256) public a;
    mapping(address => uint256) public b;

    event Mint(address indexed minter, uint256 amount);
    event Burn(address indexed burner, uint256 amount);
    event Swap(address indexed user, bool indexed a2b, uint256 input, uint256 output);
    event AddLP(address indexed provider, uint256 a, uint256 b, uint256 lp);
    event RemoveLP(address indexed provider, uint256 a, uint256 b, uint256 lp);

    function sqrt(uint256 x) internal pure returns (uint256) {
        uint256 z = x >> 1 + 1;
        uint256 y = x;
        while (z < y)
        {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // initializer, derived contracts must call this in its public init() function
    function _init(address _baseToken, address _treasury, uint256 _duration, uint256 _a, uint256 _b) internal {
        require(openTime == 0, "Initialized");
        require(_a > 0 && _b > 0, "No initial liquidity");
        baseToken = _baseToken;

        treasury = _treasury;
        openTime = _blockTimestamp();
        closeTime = _blockTimestamp() + _duration;

        canBuy = true;

        name = "iGain LP token";
        symbol = "iGLP";
        decimals = ERC20(baseToken).decimals();

        uint256 _lp = sqrt(_a * _b);
        poolA = _a;
        poolB = _b;
        _mint(_msgSender(), _lp);
        _mint(address(0), 1000); //lock liquidity 
        if(_b > _a) {
            a[_msgSender()] = _b - _a;
            doTransferIn(baseToken, _msgSender(), _b);
        }
        else {
            b[_msgSender()] = _a - _b;
            doTransferIn(baseToken, _msgSender(), _a);
        }
        emit AddLP(_msgSender(), _a, _b, _lp);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint256 f) internal pure returns (uint amountOut) {
        uint256 amountInWithFee = amountIn * f;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1e18 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut, uint256 f) internal pure returns (uint amountIn) {
        uint numerator = reserveIn * amountOut * 1e18;
        uint denominator = (reserveOut - amountOut) * f;
        amountIn = numerator / denominator + 1;
    }

    // calculate how many of a needs to be swapped for b when burning a
    function burnPartialHelper(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint256 f) internal pure returns (uint256 x) {
        uint256 r = amountIn * 4 * reserveIn * f / 1e18; //prevent stack too deep
        x = (reserveOut - amountIn) * f / 1e18 + reserveIn; // (reserveOut - a) * fee + reserveIn
        x = sqrt(x * x + r) - x;
        x = x * 1e18 / f / 2;
    }

    // 1 - swap fee (numerator, in 1e18 format)
    function fee() public view returns (uint256) {
        uint256 time = _blockTimestamp();
        uint256 _fee;
        if(time < closeTime) {
            _fee = minFee + (
                (time - openTime) * (maxFee - minFee) / (closeTime - openTime)
            );
        }
        else {
            _fee = maxFee;
        }
        return 1e18 - _fee;
    }

    /***********************************|
    |          mint/burn token          |
    |__________________________________*/

    // pay `amount` baseToken, get the same amount of a and b
    function mint(uint256 amount) external {
        require(canBuy, "cannot buy");
        a[_msgSender()] = a[_msgSender()] + amount;
        b[_msgSender()] = b[_msgSender()] + amount;
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `amount` of a and b, get `amount` baseToken 
    function burn(uint256 amount) external {
        require(canBuy, "cannot buy");
        a[_msgSender()] = a[_msgSender()] - amount;
        b[_msgSender()] = b[_msgSender()] - amount;
        doTransferOut(baseToken, _msgSender(), amount);
    }

    // pay `amount` baseToken, get more than `min_a` of a
    function mintA(uint256 amount, uint256 min_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountOut(amount, poolB, poolA, fee());
        poolB = poolB + amount;
        poolA = poolA - _a;
        emit Swap(_msgSender(), false, amount, _a);
        _a = _a + amount;
        require(_a >= min_a, "SLIPPAGE_DETECTED");
        a[_msgSender()] = a[_msgSender()] + _a;
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `_a` of a, receive more than `min_amount` of baseToken
    function burnA(uint256 _a, uint256 min_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        // amount = _a - x
        uint256 x = burnPartialHelper(_a, poolA, poolB, fee());
        amount = _a - x;
        require(amount >= min_amount, "SLIPPAGE_DETECTED");
        
        // A = A + x
        // B = B - amount
        poolA = poolA + x;
        poolB = poolB - amount;
        a[_msgSender()] = a[_msgSender()] - _a;
        emit Swap(_msgSender(), true, x, amount);
        doTransferOut(baseToken, _msgSender(), amount);
    }

    // pay `amount` baseToken, get more than `min_b` of b
    function mintB(uint256 amount, uint256 min_b) external returns (uint256 _b) {
        require(canBuy, "cannot buy");
        _b = getAmountOut(amount, poolA, poolB, fee());
        poolA = poolA + amount;
        poolB = poolB - _b;
        emit Swap(_msgSender(), true, amount, _b);
        _b = _b + amount;
        require(_b >= min_b, "SLIPPAGE_DETECTED");
        b[_msgSender()] = b[_msgSender()] + _b;
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `b` of b, receive more than `min_amount` of baseToken
    function burnB(uint256 _b, uint256 min_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        // amount = _b - x
        uint256 x = burnPartialHelper(_b, poolB, poolA, fee());
        amount = _b - x;
        require(amount >= min_amount, "SLIPPAGE_DETECTED");
        
        // B = B + x
        // A = A - amount
        poolB = poolB + x;
        poolA = poolA - amount;
        b[_msgSender()] = b[_msgSender()] - _b;
        emit Swap(_msgSender(), false, x, amount);
        doTransferOut(baseToken, _msgSender(), amount);
    }

    // pay `amount` baseToken, get more than `min_lp` liquidity provider share
    function mintLP(uint256 amount, uint256 min_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        // k = poolA * poolB
        // _lp = ( sqrt(_k)/sqrt(k) - 1 ) * LP
        uint256 k = sqrt(poolA * poolB);
        uint256 _k = sqrt((poolA + amount) * (poolB + amount));
        _lp = (_k * 1e18 / k - 1e18) * _totalSupply / 1e18;
        _lp = _lp * fee() / 1e18; //fee

        require(_lp >= min_lp, "SLIPPAGE_DETECTED");
        poolA = poolA + amount;
        poolB = poolB + amount;
        _mint(_msgSender(), _lp);
        doTransferIn(baseToken, _msgSender(), amount);
        emit AddLP(_msgSender(), amount, amount, _lp);
    }

    // burn `lp` of liquidity provider share, recieve more than `min_amount` of baseToken
    function burnLP(uint256 lp, uint256 min_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        uint256 s = poolA + poolB;

        uint256 f = fee() * lp / _totalSupply;
        amount = poolA * poolB * 4 * f / 1e18;
        amount = amount * (2e18 - f) / 1e18;
        amount = sqrt(s * s - amount);
        amount = (s - amount) / 2;
        require(amount >= min_amount, "SLIPPAGE_DETECTED");
        poolA = poolA - amount;
        poolB = poolB - amount;
        _burn(_msgSender(), lp);
        doTransferOut(baseToken, _msgSender(), amount);
        emit RemoveLP(_msgSender(), amount, amount, lp);
    }

    /***********************************|
    |               swap                |
    |__________________________________*/

    function swapAtoB(uint256 _a, uint256 min_b) external returns (uint256 _b) {
        require(canBuy, "cannot buy");
        _b = getAmountOut(_a, poolA, poolB, fee());
        require(_b >= min_b, "SLIPPAGE_DETECTED");
        poolA = poolA + _a;
        poolB = poolB - _b;
        a[_msgSender()] = a[_msgSender()] - _a;
        b[_msgSender()] = b[_msgSender()] + _b;
        emit Swap(_msgSender(), true, _a, _b);
    }

    function swapBtoA(uint256 _b, uint256 min_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountOut(_b, poolB, poolA, fee());
        require(_a >= min_a, "SLIPPAGE_DETECTED");
        poolB = poolB + _b;
        poolA = poolA - _a;
        b[_msgSender()] = b[_msgSender()] - _b;
        a[_msgSender()] = a[_msgSender()] + _a;
        emit Swap(_msgSender(), false, _b, _a);
    }


    /***********************************|
    |       add/remove liquidity        |
    |__________________________________*/

    // deposit `_a` of a and `_b` of b, get more than `min_lp` of liquidity provider share
    function depositLP(uint256 _a, uint256 _b, uint256 min_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        // k = poolA * poolB
        // _lp = ( sqrt(_k)/sqrt(k) - 1 ) * LP
        uint256 k = sqrt(poolA * poolB);
        uint256 _k = sqrt((poolA + _a) * (poolB + _b));
        _lp = (_k * 1e18 / k - 1e18) * _totalSupply / 1e18;
        _lp = _lp * fee() / 1e18; //fee

        require(_lp >= min_lp, "SLIPPAGE_DETECTED");
        poolA = poolA + _a;
        poolB = poolB + _b;
        a[_msgSender()] = a[_msgSender()] - _a;
        b[_msgSender()] = b[_msgSender()] - _b;
        _mint(_msgSender(), _lp);
        emit AddLP(_msgSender(), _a, _b, _lp);
    }

    // burn no more than `max_lp` of liquidity provider share, withdraw `_a` of a and `_b` of b
    function withdrawLP(uint256 _a, uint256 _b, uint256 max_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        // k = poolA * poolB
        // _lp = ( 1 - sqrt(_k)/sqrt(k) ) * LP
        uint256 k = sqrt(poolA * poolB);
        uint256 _k = sqrt((poolA - _a) * (poolB - _b));
        _lp = (1e18 - _k * 1e18 / k) * _totalSupply / 1e18;
        _lp = _lp * 1e18 / fee(); //fee

        require(_lp <= max_lp, "SLIPPAGE_DETECTED");
        poolA = poolA - _a;
        poolB = poolB - _b;
        a[_msgSender()] = a[_msgSender()] + _a;
        b[_msgSender()] = b[_msgSender()] + _b;
        _burn(_msgSender(), _lp);
        emit RemoveLP(_msgSender(), _a, _b, _lp);
    }


    /***********************************|
    |             settlement            |
    |__________________________________*/

    // can only call once after closeTime
    // settle bPrice
    function close() external virtual;

    // burn a, b, and lp and receive baseToken
    function claim() external returns (uint256 amount) {
        require(!canBuy, "Not yet");

        uint256 _lp = _balances[_msgSender()];
        uint256 _a;
        uint256 _b;

        if(_lp > 0) {
            _a = poolA * _lp / _totalSupply;   
            _b = poolB * _lp / _totalSupply;

            poolA = poolA - _a;
            poolB = poolB - _b;
            _burn(_msgSender(), _lp);
            emit RemoveLP(_msgSender(), _a, _b, _lp);
        }

        _a = _a + a[_msgSender()];
        _b = _b + b[_msgSender()];
        a[_msgSender()] = 0;
        b[_msgSender()] = 0;

        amount = (_a * (1e18 - bPrice) + _b * bPrice) / 1e18;
        doTransferOut(baseToken, _msgSender(), amount);
    }


    /***********************************|
    |          helper function          |
    |__________________________________*/

    function doTransferIn(address tokenAddr, address from, uint amount) internal {
        IERC20 token = IERC20(tokenAddr);
        token.safeTransferFrom(from, address(this), amount);

        emit Mint(from, amount);
    }

    function doTransferOut(address tokenAddr, address to, uint amount) internal {
        uint256 _fee = amount * protocolFee / 1e18;

        IERC20 token = IERC20(tokenAddr);
        token.safeTransfer(to, amount - _fee);
        token.safeTransfer(treasury, _fee);

        emit Burn(to, amount);
    }

}
