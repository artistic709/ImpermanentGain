pragma solidity 0.5.17;

library SafeMath {

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) 
            return 0;
        uint256 c = a * b;
        require(c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0);
        uint256 c = a / b;
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;
        return c;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);
        return c;
    }

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0);
        return a % b;
    }

    function sqrt(uint256 x) internal pure returns (uint256) {
        uint256 z = add(x >> 1, 1);
        uint256 y = x;
        while (z < y)
        {
            y = z;
            z = ((add((x / z), z)) / 2);
        }
        return y;
    }
}

contract ERC20 {
    using SafeMath for uint256;

    mapping (address => uint256) internal _balances;
    mapping (address => mapping (address => uint256)) internal _allowed;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    uint256 internal _totalSupply;

    /**
    * @dev Total number of tokens in existence
    */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
    * @dev Gets the balance of the specified address.
    * @param owner The address to query the balance of.
    * @return A uint256 representing the amount owned by the passed address.
    */
    function balanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }

    /**
    * @dev Function to check the amount of tokens that an owner allowed to a spender.
    * @param owner address The address which owns the funds.
    * @param spender address The address which will spend the funds.
    * @return A uint256 specifying the amount of tokens still available for the spender.
    */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowed[owner][spender];
    }

    /**
    * @dev Transfer token to a specified address
    * @param to The address to transfer to.
    * @param value The amount to be transferred.
    */
    function transfer(address to, uint256 value) public returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /**
    * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
    * Beware that changing an allowance with this method brings the risk that someone may use both the old
    * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
    * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
    * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    * @param spender The address which will spend the funds.
    * @param value The amount of tokens to be spent.
    */
    function approve(address spender, uint256 value) public returns (bool) {
        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
    * @dev Transfer tokens from one address to another.
    * Note that while this function emits an Approval event, this is not required as per the specification,
    * and other compliant implementations may not emit the event.
    * @param from address The address which you want to send tokens from
    * @param to address The address which you want to transfer to
    * @param value uint256 the amount of tokens to be transferred
    */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        if (from != msg.sender && _allowed[from][msg.sender] != uint256(-1))
            _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0));
        _balances[from] = _balances[from].sub(value);
        _balances[to] = _balances[to].add(value);
        emit Transfer(from, to, value);
    }

}

contract ERC20Mintable is ERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    function _mint(address to, uint256 amount) internal {
        _balances[to] = _balances[to].add(amount);
        _totalSupply = _totalSupply.add(amount);
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        _balances[from] = _balances[from].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(from, address(0), amount);
    }
}

interface IERC20 {
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address recipient, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address spender, uint amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

library Address {
    function isContract(address account) internal view returns (bool) {
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != 0x0 && codehash != accountHash);
    }
}

library SafeERC20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }
    function callOptionalReturn(IERC20 token, bytes memory data) private {
        require(address(token).isContract(), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

contract Oracle {
    function latestAnswer() external view returns (int256);
}

contract ImpermanentGain is ERC20Mintable {
    using SafeMath for *;
    using SafeERC20 for IERC20;

    bool public canBuy;

    address public treasury;
    address public baseToken;
    Oracle public oracle;

    uint256 public openTime;
    uint256 public closeTime;

    uint256 public openPrice;
    uint256 public closePrice;

    uint256 public constant leverage = 10;
    uint256 public constant protocolFee = 100;

    // a + b = $1
    // b = tokenized put of impermanent loss
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

    function init(address _baseToken, address _oracle, address _treasury, uint256 _duration, uint256 _a, uint256 _b) public {
        require(openTime == 0, "Initialized");
        require(_a > 0 && _b > 0, "No initial liquidity");
        baseToken = _baseToken;
        oracle = Oracle(_oracle);
        treasury = _treasury;
        openTime = now;
        closeTime = now.add(_duration);
        openPrice = uint256(oracle.latestAnswer());

        canBuy = true;

        name = "iGain LP token";
        symbol = "iGLP";
        decimals = 18;

        uint256 _lp = _a.mul(_b).sqrt();
        poolA = _a;
        poolB = _b;
        _mint(msg.sender, _lp);
        if(_b > _a) {
            a[msg.sender] = _b.sub(_a);
            doTransferIn(baseToken, msg.sender, _b);
        }
        else {
            b[msg.sender] = _a.sub(_b);
            doTransferIn(baseToken, msg.sender, _a);
        }
        emit AddLP(msg.sender, _lp, _a, _b);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }


    /***********************************|
    |          mint/burn token          |
    |__________________________________*/

    // pay `amount` baseToken, get the same amount of a and b
    function mint(uint256 amount) external {
        require(canBuy, "cannot buy");
        a[msg.sender] = a[msg.sender].add(amount);
        b[msg.sender] = b[msg.sender].add(amount);
        doTransferIn(baseToken, msg.sender, amount);
    }

    // burn `amount` of a and b, get `amount` baseToken 
    function burn(uint256 amount) external {
        require(canBuy, "cannot buy");
        a[msg.sender] = a[msg.sender].sub(amount);
        b[msg.sender] = b[msg.sender].sub(amount);
        doTransferOut(baseToken, msg.sender, amount);
    }

    // pay `amount` baseToken, get more that `min_a` of a
    function mintA(uint256 amount, uint256 min_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountOut(amount, poolB, poolA);
        poolB = poolB.add(amount);
        poolA = poolA.sub(_a);
        emit Swap(msg.sender, false, amount, _a);
        _a = _a.add(amount);
        require(_a >= min_a, "SLIPPAGE_DETECTED");
        a[msg.sender] = a[msg.sender].add(_a);
        doTransferIn(baseToken, msg.sender, amount);
    }

    // burn no more than `max_a` of a, receive `amount` baseToken
    function burnA(uint256 amount, uint256 max_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountIn(amount, poolA, poolB);
        poolB = poolB.sub(amount);
        poolA = poolA.add(_a);
        emit Swap(msg.sender, true, _a, amount);
        _a = _a.add(amount);
        require(_a <= max_a, "SLIPPAGE_DETECTED");
        a[msg.sender] = a[msg.sender].sub(_a);
        doTransferOut(baseToken, msg.sender, amount);
    }

    // pay `amount` baseToken, get more that `min_b` of b
    function mintB(uint256 amount, uint256 min_b) external returns (uint256 _b) {
        require(canBuy, "cannot buy");
        _b = getAmountOut(amount, poolA, poolB);
        poolA = poolA.add(amount);
        poolB = poolB.sub(_b);
        emit Swap(msg.sender, true, amount, _b);
        _b = _b.add(amount);
        require(_b >= min_b, "SLIPPAGE_DETECTED");
        b[msg.sender] = b[msg.sender].add(_b);
        doTransferIn(baseToken, msg.sender, amount);
    }

    // burn no more than `max_b` of b, receive `amount` baseToken
    function burnB(uint256 amount, uint256 max_b) external returns (uint256 _b) {
        require(canBuy, "cannot buy");
        _b = getAmountIn(amount, poolB, poolA);
        poolA = poolA.sub(amount);
        poolB = poolB.add(_b);
        emit Swap(msg.sender, false, _b, amount);
        _b = _b.add(amount);
        require(_b <= max_b, "SLIPPAGE_DETECTED");
        b[msg.sender] = b[msg.sender].sub(_b);
        doTransferOut(baseToken, msg.sender, amount);
    }

    // pay `amount` baseToken, get more than `min_lp` liquidity provider share
    function mintLP(uint256 amount, uint256 min_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        uint256 k = poolA.mul(poolB);
        uint256 _k = poolA.add(amount).mul(poolB.add(amount));

        // ( sqrt(_k/k) - 1 ) * LP
        _lp = _k.mul(1e36).div(k).sqrt().sub(1e18).mul(_totalSupply).div(1e18);
        _lp = _lp.mul(997).div(1000); //fee

        require(_lp >= min_lp, "SLIPPAGE_DETECTED");
        poolA = poolA.add(amount);
        poolB = poolB.add(amount);
        _mint(msg.sender, _lp);
        doTransferIn(baseToken, msg.sender, amount);
        emit AddLP(msg.sender, _lp, amount, amount);
    }

    // burn no more than `min_lp` liquidity provider share, receive `amount` baseToken
    function burnLP(uint256 amount, uint256 max_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        uint256 k = poolA.mul(poolB);
        uint256 _k = poolA.sub(amount).mul(poolB.sub(amount));

        // ( 1 - sqrt(_k/k) ) * LP
        _lp = (1e18).sub(_k.mul(1e36).div(k).sqrt()).mul(_totalSupply).div(1e18);
        _lp = _lp.mul(1000).div(997); //fee

        require(_lp <= max_lp, "SLIPPAGE_DETECTED");
        poolA = poolA.sub(amount);
        poolB = poolB.sub(amount);
        _burn(msg.sender, _lp);
        doTransferOut(baseToken, msg.sender, amount);
        emit RemoveLP(msg.sender, _lp, amount, amount);
    }


    /***********************************|
    |               swap                |
    |__________________________________*/

    function swapAtoB(uint256 _a, uint256 min_b) external returns (uint256 _b) {
        require(canBuy, "cannot buy");
        _b = getAmountOut(_a, poolA, poolB);
        require(_b >= min_b, "SLIPPAGE_DETECTED");
        poolA = poolA.add(_a);
        poolB = poolB.sub(_b);
        a[msg.sender] = a[msg.sender].sub(_a);
        b[msg.sender] = b[msg.sender].add(_b);
        emit Swap(msg.sender, true, _a, _b);
    }

    function swapBtoA(uint256 _b, uint256 min_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountOut(_b, poolB, poolA);
        require(_a >= min_a, "SLIPPAGE_DETECTED");
        poolB = poolB.add(_b);
        poolA = poolA.sub(_a);
        b[msg.sender] = b[msg.sender].sub(_b);
        a[msg.sender] = a[msg.sender].add(_a);
        emit Swap(msg.sender, false, _b, _a);
    }


    /***********************************|
    |       add/remove liquidity        |
    |__________________________________*/

    // deposit `_a` of a and `_b` of b, get more than `min_lp` of liquidity provider share
    function depositLP(uint256 _a, uint256 _b, uint256 min_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        uint256 k = poolA.mul(poolB);
        uint256 _k = poolA.add(_a).mul(poolB.add(_b));

        // ( sqrt(_k/k) - 1 ) * LP
        _lp = _k.mul(1e36).div(k).sqrt().sub(1e18).mul(_totalSupply).div(1e18);
        _lp = _lp.mul(997).div(1000); //fee

        require(_lp >= min_lp, "SLIPPAGE_DETECTED");
        poolA = poolA.add(_a);
        poolB = poolB.add(_b);
        a[msg.sender] = a[msg.sender].sub(_a);
        b[msg.sender] = b[msg.sender].sub(_b);
        _mint(msg.sender, _lp);
        emit AddLP(msg.sender, _lp, _a, _b);
    }

    // burn no more than `max_lp` of liquidity provider share, withdraw `_a` of a and `_b` of b
    function withdrawLP(uint256 _a, uint256 _b, uint256 max_lp) external returns (uint256 _lp) {
        require(canBuy, "cannot buy");
        uint256 k = poolA.mul(poolB);
        uint256 _k = poolA.sub(_a).mul(poolB.sub(_b));

        // ( 1 - sqrt(_k/k) ) * LP
        _lp = (1e18).sub(_k.mul(1e36).div(k).sqrt()).mul(_totalSupply).div(1e18);
        _lp = _lp.mul(1000).div(997); //fee

        require(_lp <= max_lp, "SLIPPAGE_DETECTED");
        poolA = poolA.sub(_a);
        poolB = poolB.sub(_b);
        a[msg.sender] = a[msg.sender].add(_a);
        b[msg.sender] = b[msg.sender].add(_b);
        _burn(msg.sender, _lp);
        emit RemoveLP(msg.sender, _lp, _a, _b);
    }


    /***********************************|
    |             settlement            |
    |__________________________________*/

    // can only call once after closeTime
    // get price from oracle and calculate IL
    function close() external {
        require(now >= closeTime, "Not yet");
        require(canBuy, "Closed");
        canBuy = false;
        closePrice = uint256(oracle.latestAnswer());
        uint256 ratio = openPrice.mul(1e18).div(closePrice);
        uint256 _bPrice = calcIL(ratio).mul(leverage); //leverage
        bPrice = _bPrice > 1e18 ? 1e18 : _bPrice;
    }

    function calcIL(uint256 ratio) public pure returns (uint256) {
        // 1 - sqrt(ratio) * 2 / (1 + ratio)
        return (1e18).sub(ratio.mul(1e18).sqrt().mul(2e18).div(ratio.add(1e18)));
    }

    // burn a, b, and lp and receive baseToken
    function claim() external returns (uint256 amount) {
        require(!canBuy, "Not yet");

        uint256 _lp = _balances[msg.sender];
        uint256 _a;
        uint256 _b;

        if(_lp > 0) {
            _a = poolA.mul(_lp).div(_totalSupply);   
            _b = poolB.mul(_lp).div(_totalSupply);

            poolA = poolA.sub(_a);
            poolB = poolB.sub(_b);
            _burn(msg.sender, _lp);
            emit RemoveLP(msg.sender, _lp, _a, _b);
        }

        _a = _a.add(a[msg.sender]);
        _b = _b.add(b[msg.sender]);
        a[msg.sender] = 0;
        b[msg.sender] = 0;

        amount = _a.mul((1e18).sub(bPrice)).add(_b.mul(bPrice)).div(1e18);
        doTransferOut(baseToken, msg.sender, amount);
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
        uint256 fee = amount.div(protocolFee);

        IERC20 token = IERC20(tokenAddr);
        token.safeTransfer(to, amount.sub(fee));
        token.safeTransfer(treasury, fee);

        emit Burn(to, amount);
    }

}
