pragma solidity 0.8.7;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenFactory.sol";

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

    TokenFactory public constant Factory = TokenFactory(0x2eFC352936d5c52B3Ee061367c834BF768F11715);

    ERC20Mintable public a;
    ERC20Mintable public b;

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
    function _init(address _baseToken, address _treasury, string memory _batchName, uint256 _duration, uint256 _a, uint256 _b) internal {
        require(openTime == 0, "Initialized");
        require(_a > 0 && _b > 0, "No initial liquidity");
        baseToken = _baseToken;

        treasury = _treasury;
        openTime = _blockTimestamp();
        closeTime = _blockTimestamp() + _duration;

        canBuy = true;

        name = string(abi.encodePacked("iGain LP token ", _batchName));
        symbol = string(abi.encodePacked("iGLP ", _batchName));
        decimals = ERC20(baseToken).decimals();

        a = ERC20Mintable(Factory.newToken(address(this), string(abi.encodePacked("iGain A token ", _batchName)), string(abi.encodePacked("iG-A ", _batchName)), decimals));
        b = ERC20Mintable(Factory.newToken(address(this), string(abi.encodePacked("iGain B token ", _batchName)), string(abi.encodePacked("iG-B ", _batchName)), decimals));

        uint256 _lp = sqrt(_a * _b);
        poolA = _a;
        poolB = _b;
        _mint(_msgSender(), _lp);
        _mint(address(0), 1000); //lock liquidity
        if(_b > _a) {
            a.mint(_msgSender(), _b - _a);
            doTransferIn(baseToken, _msgSender(), _b);
        }
        else {
            b.mint(_msgSender(), _a - _b);
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

    // calculate how many token needs to be swapped when minting/burning
    function swapPartialHelper(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint256 f) internal pure returns (uint256 x) {
        uint256 r = amountIn * 4 * reserveIn * f / 1e18; //prevent stack too deep
        x = (reserveOut - amountIn) * f / 1e18 + reserveIn; // (reserveOut - a) * fee + reserveIn
        x = sqrt(x * x + r) - x;
        x = x * 1e18 / f / 2;
    }

    // 1 - swap fee (numerator, in 1e18 format)
    function fee() public virtual view returns (uint256) {
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
        a.mint(_msgSender(), amount);
        b.mint(_msgSender(), amount);
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `amount` of a and b, get `amount` baseToken
    function burn(uint256 amount) external {
        require(canBuy, "cannot buy");
        a.burn(_msgSender(), amount);
        b.burn(_msgSender(), amount);
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
        a.mint(_msgSender(), _a);
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // mint `_a` of a, pay no more than `max_amount` of baseToken
    function mintExactA(uint256 _a, uint256 max_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        amount = swapPartialHelper(_a, poolB, poolA, fee());
        require(amount <= max_amount, "SLIPPAGE_DETECTED");
        // y = _a - amount
        uint256 y = _a - amount;
        // A = A - y
        // B = B + amount
        poolA = poolA - y;
        poolB = poolB + amount;
        a.mint(_msgSender(), _a);
        emit Swap(_msgSender(), false, amount, y);
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `_a` of a, receive more than `min_amount` of baseToken
    function burnA(uint256 _a, uint256 min_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        // amount = _a - x
        uint256 x = swapPartialHelper(_a, poolA, poolB, fee());
        amount = _a - x;
        require(amount >= min_amount, "SLIPPAGE_DETECTED");

        // A = A + x
        // B = B - amount
        poolA = poolA + x;
        poolB = poolB - amount;
        a.burn(_msgSender(), _a);
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
        b.mint(_msgSender(), _b);
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // mint `_b` of b, pay no more than `max_amount` of baseToken
    function mintExactB(uint256 _b, uint256 max_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        amount = swapPartialHelper(_b, poolA, poolB, fee());
        require(amount <= max_amount, "SLIPPAGE_DETECTED");
        // y = _b - amount
        uint256 y = _b - amount;
        // B = B - y
        // A = A + amount
        poolB = poolB - y;
        poolA = poolA + amount;
        b.mint(_msgSender(), _b);
        emit Swap(_msgSender(), true, amount, y);
        doTransferIn(baseToken, _msgSender(), amount);
    }

    // burn `b` of b, receive more than `min_amount` of baseToken
    function burnB(uint256 _b, uint256 min_amount) external returns (uint256 amount) {
        require(canBuy, "cannot buy");
        // amount = _b - x
        uint256 x = swapPartialHelper(_b, poolB, poolA, fee());
        amount = _b - x;
        require(amount >= min_amount, "SLIPPAGE_DETECTED");

        // B = B + x
        // A = A - amount
        poolB = poolB + x;
        poolA = poolA - amount;
        b.burn(_msgSender(), _b);
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
        a.burn(_msgSender(), _a);
        b.mint(_msgSender(), _b);
        emit Swap(_msgSender(), true, _a, _b);
    }

    function swapBtoA(uint256 _b, uint256 min_a) external returns (uint256 _a) {
        require(canBuy, "cannot buy");
        _a = getAmountOut(_b, poolB, poolA, fee());
        require(_a >= min_a, "SLIPPAGE_DETECTED");
        poolB = poolB + _b;
        poolA = poolA - _a;
        b.burn(_msgSender(), _b);
        a.mint(_msgSender(), _a);
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
        a.burn(_msgSender(), _a);
        b.burn(_msgSender(), _b);
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
        a.mint(_msgSender(), _a);
        b.mint(_msgSender(), _b);
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
        uint256 _a = a.balanceOf(_msgSender());
        uint256 _b = b.balanceOf(_msgSender());

        a.burn(_msgSender(), _a);
        b.burn(_msgSender(), _b);

        if(_lp > 0) {
            uint256 __a = poolA * _lp / _totalSupply;
            uint256 __b = poolB * _lp / _totalSupply;

            poolA = poolA - __a;
            poolB = poolB - __b;
            _a = _a + __a;
            _b = _b + __b;
            _burn(_msgSender(), _lp);
            emit RemoveLP(_msgSender(), _a, _b, _lp);
        }

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
