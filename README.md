# IGainAAVEIRS.sol


## Introduction

The settlement price of Long Token is determined by the deposit interest rate in the term period on AAVE platform. The more the interest accumulates, the higher (lower) the price of Long (Short) Token is.

Purchasing Long Token means take a long position on future interest rate; in contrast, buying Short Token indicates holding a short position on future interest rate.  

## Price Settlement

`AAVE.getReserveNormalizedVariableDebt(asset)`
Returns the normalized variable debt per unit of asset.

This is the exchange rate of the tokenized variable debt and the value increases with the growth of the floating interest rate. 

1. Save real-time exchange rate as initializing smart contract 
```
initialRate = AAVE.getReserveNormalizedVariableDebt(asset)
```

2. Record real-time exchange rate on settlement day
```
endRate = AAVE.getReserveNormalizedVariableDebt(asset);
```

3. With `initialRate` and `endRate`, the growth of the floating deposit interest rate in the period can be calculated with percernt form `ratio`：

```
ratio = (endRate - initialRate) / initialRate
```
For example, if the ratio on the expiry day is 0.04, then it can be deduced that the interest rate is 4%. Settled with 4% interest rate, the Long Token is priced as $0.04 while the Short Token should be $0.96.

4. To increase capital efficiency, adopt appropriate leverage according to backtesting history data 

As above stated, if with 10x leverage, then the Long Token is settled with the price of $0.4 while the Short Token should be $0.6. 
```
_bPrice = leverage * rate
```

Long is settled as bPrice 

```
bPrice = min(_bPrice, 1) # Max. Price of Long is $1
```

Shoer = 1 - bPrice



---

# IGainYearnIRS.sol
## Introduction

The mechanism and calculation of IGainYearnIRS.sol is exactly the same as IGainAAVEIRS, and the only different part is to replace AAVE interest rate with Yearn interest rate. 

-> `AAVE.getReserveNormalizedVariableDebt(asset)` replaces with`vault.pricePerShare()`


---

# IGainDelta.sol
## Introduction

The mechanism of IGainDelta.sol is similar to the binary option in crypto price, but the payoff of the Long Token does not comply with all-or-none law. The settled price of Long Token will gradually go up from $0 to $1. As the leverage is larger, the liquidity is becoming more intensive. 

![](https://i.imgur.com/sokYzNa.png)


## Price Settlement
<img width="570" src="https://user-images.githubusercontent.com/6032476/142633693-fcaf5793-6451-4799-b72e-ea2c540f301f.png">

```
y：Settled Price of Long Token, bPrice = calcDelta()
x：Crypto Price on Settlement Date, closePrice
a：Price on initialization, anchor = openPrice
l：Leverage, lever
```

As the leverage (l) is larger, the horizontal compression occurs and the function's base graph is shrunk along the x-axis. Therefore, the liquidity values move in closer and closer to the centre, which is known as the starting price. In addition, to the same settlement price, the difference between the centre and the strike price will be inversely proportional to the leverage (l). 

As l = ∞, the curve is a step function.
![](https://i.imgur.com/kBJr1Hd.png)

