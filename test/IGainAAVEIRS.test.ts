import { expect, use } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { ERC20Mintable, IGainAAVEIRS } from "../typechain";
import { getRevertError, getSigner } from "./utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "@ethersproject/units";
import { getAddress } from "@ethersproject/address";
import BN from "bignumber.js";

use(chaiAsPromised);
const e18 = BigNumber.from("10").pow(18);

function sqrt(value: BigNumber): BigNumber {
  return BigNumber.from(
    new BN(value.toString()).sqrt().integerValue(BN.ROUND_FLOOR).toString(10)
  );
}

function getFee(
  openTime: BigNumber,
  closeTime: BigNumber,
  txTime: BigNumber,
  minFee: BigNumber,
  maxFee: BigNumber
): BigNumber {
  if (closeTime.lte(openTime)) return e18.sub(maxFee);
  return BigNumber.from("10")
    .pow(18)
    .sub(
      minFee.add(
        maxFee
          .sub(minFee)
          .mul(txTime.sub(openTime))
          .div(closeTime.sub(openTime))
      )
    );
}

describe("IGainAAVEIRS", function () {
  const amount = BigNumber.from(parseUnits("10000"));
  let IGainAAVEIRS: IGainAAVEIRS;
  let IGainAAVEIRSUser: IGainAAVEIRS;
  let IGainAAVEIRSUser2: IGainAAVEIRS;
  let accounts: SignerWithAddress[];
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let base: ERC20Mintable;
  let aContract: ERC20Mintable;
  let bContract: ERC20Mintable;
  let timeGap = 100;

  // Init configs
  const baseToken = getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F");
  const lendingPool = getAddress("0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");
  const asset = getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F");
  const treasury = getAddress("0x83D0D842e6DB3B020f384a2af11bD14787BEC8E7");
  const batchName = "IRS-aDAI";
  const leverage = BigNumber.from("5000000000000000000");
  const duration = BigNumber.from("86400");
  const a = BigNumber.from("1000000000000000000");
  const b = BigNumber.from("1000000000000000000");

  before(async function () {
    accounts = await ethers.getSigners();
    operator = accounts[0];
    user = accounts[1];
    user2 = accounts[2];

    const IGainAAVEIRSDeployer = await ethers.getContractFactory(
      "IGainAAVEIRS"
    );
    IGainAAVEIRS = await IGainAAVEIRSDeployer.deploy();
    IGainAAVEIRSUser = IGainAAVEIRS.connect(user);
    IGainAAVEIRSUser2 = IGainAAVEIRS.connect(user2);
    await IGainAAVEIRS.deployed();

    base = await ethers.getContractAt(
      "ERC20Mintable",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI
    );
    const basePool = base.connect(
      await getSigner("0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7") // Curve Pool
    );
    await basePool.transfer(operator.address, amount);
    await basePool.transfer(user.address, amount);
    await base.approve(IGainAAVEIRS.address, amount);
    await base.connect(user).approve(IGainAAVEIRS.address, amount);
  });

  describe("Before Init", async function () {
    it("Should not mintable", async function () {
      await expect(IGainAAVEIRS.mint(amount)).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(IGainAAVEIRS.mintLP(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(IGainAAVEIRS.mintA(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(
        IGainAAVEIRS.mintExactA(amount, "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
      await expect(IGainAAVEIRS.mintB(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(
        IGainAAVEIRS.mintExactB(amount, "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
    });

    it("Should not burnable", async function () {
      await expect(IGainAAVEIRS.burn(amount)).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(IGainAAVEIRS.burnA(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(IGainAAVEIRS.burnB(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
      await expect(IGainAAVEIRS.burnLP(amount, "0")).eventually.be.rejectedWith(
        Error,
        getRevertError("cannot buy")
      );
    });

    it("Should not swapable", async function () {
      await expect(
        IGainAAVEIRS.swapAtoB(amount, "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
      await expect(
        IGainAAVEIRS.swapBtoA(amount, "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
    });

    it("Should not depositable or withdrawable", async function () {
      await expect(
        IGainAAVEIRS.depositLP("0", "0", "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
      await expect(
        IGainAAVEIRS.withdrawLP("0", "0", "0")
      ).eventually.be.rejectedWith(Error, getRevertError("cannot buy"));
    });

    it("Should not claimable", async function () {
      await expect(IGainAAVEIRS.claim()).eventually.be.rejected;
    });
  });

  describe("Init", async function () {
    it("Should initable", async function () {
      await IGainAAVEIRS.init(
        baseToken,
        lendingPool,
        asset,
        treasury,
        batchName,
        leverage,
        duration,
        a,
        b
      );

      const [
        resultBaseToken,
        resultLendingPool,
        resultAsset,
        resultTreasury,
        resultLeverage,
        resultOpenTime,
        resultCloseTime,
        resultA,
        resultB,
      ] = await Promise.all([
        IGainAAVEIRS.baseToken(),
        IGainAAVEIRS.AAVE(),
        IGainAAVEIRS.asset(),
        IGainAAVEIRS.treasury(),
        IGainAAVEIRS.leverage(),
        IGainAAVEIRS.openTime(),
        IGainAAVEIRS.closeTime(),
        IGainAAVEIRS.a(),
        IGainAAVEIRS.b(),
      ]);

      expect(baseToken).equal(resultBaseToken);
      expect(lendingPool).equal(resultLendingPool);
      expect(asset).equal(resultAsset);
      expect(treasury).equal(resultTreasury);
      expect(leverage).equal(resultLeverage);
      expect(duration).equal(resultCloseTime.sub(resultOpenTime));

      aContract = await ethers.getContractAt("ERC20Mintable", resultA);
      bContract = await ethers.getContractAt("ERC20Mintable", resultB);

      expect("iGain A token " + batchName).equal(await aContract.name());
      expect("iGain B token " + batchName).equal(await bContract.name());
      expect("iG-A " + batchName).equal(await aContract.symbol());
      expect("iG-B " + batchName).equal(await bContract.symbol());
      expect(await base.decimals()).equal(await aContract.decimals());
      expect(await base.decimals()).equal(await bContract.decimals());
    });

    it("Should not re-initable", async function () {
      await expect(
        IGainAAVEIRS.init(
          baseToken,
          lendingPool,
          asset,
          treasury,
          batchName,
          leverage,
          duration,
          a,
          b
        )
      ).eventually.be.rejected;
    });
  });

  describe("Before close time", async function () {
    it("Should not closable", async function () {
      await expect(IGainAAVEIRS.close()).eventually.be.rejected;
    });

    describe("Mint functionality", async function () {
      const mintAmount = amount.div(9);

      it("Should mintable for a and b", async function () {
        const [
          userABalance,
          userBBalance,
          contractBaseBalance,
          userBaseBalance,
        ] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
          base.balanceOf(user.address),
        ]);
        await IGainAAVEIRSUser.mint(mintAmount);

        const [
          newUserABalance,
          newUserBBalance,
          newContractBaseBalance,
          newUserBaseBalance,
        ] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
          base.balanceOf(user.address),
        ]);
        expect(contractBaseBalance.add(mintAmount)).equal(
          newContractBaseBalance
        );
        expect(userABalance.add(mintAmount)).equal(newUserABalance);
        expect(userBBalance.add(mintAmount)).equal(newUserBBalance);
        expect(userBaseBalance.sub(mintAmount)).equal(newUserBaseBalance);
      });

      it("Should not mintable for a and b without sufficient balance", async function () {
        await expect(IGainAAVEIRSUser2.mint("1")).eventually.be.rejectedWith(
          getRevertError("Dai/insufficient-balance")
        );
      });

      it("Should mintable for a", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const maxOut = mintAmount.add(
          mintAmount
            .mul(fee)
            .mul(poolA)
            .div(poolB.mul(e18).add(mintAmount.mul(fee)))
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.mintA(mintAmount, maxOut);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.add(mintAmount)).equal(
          newContractBaseBalance
        );
        expect(userABalance.add(maxOut)).equal(newUserABalance);
        expect(userBBalance).equal(newUserBBalance);
      });

      it("Should not mintable for a and b without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.mintA("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("Dai/insufficient-balance")
        );
      });

      it("Should revert when cannot mint a more than desired", async function () {
        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const maxOut = mintAmount.add(
          mintAmount
            .mul(fee)
            .mul(poolA)
            .div(poolB.mul(e18).add(mintAmount.mul(fee)))
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.mintA(mintAmount, maxOut.add(1))
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
      });

      it("Should exact-mintable for a", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctOut = poolA.div(2);
        const r = correctOut.mul(4).mul(poolB).mul(fee).div(e18);
        const x = poolA.sub(correctOut).mul(fee).div(e18).add(poolB);
        const amount = sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await IGainAAVEIRSUser.mintExactA(correctOut, amount);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.add(amount)).equal(newContractBaseBalance);
        expect(userABalance.add(correctOut)).equal(newUserABalance);
        expect(userBBalance).equal(newUserBBalance);
      });

      it("Should revert when cannot mint a as desired", async function () {
        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctOut = poolA.div(2);
        const r = correctOut.mul(4).mul(poolB).mul(fee).div(e18);
        const x = poolA.sub(correctOut).mul(fee).div(e18).add(poolB);
        const amount = sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await expect(
          IGainAAVEIRSUser.mintExactA(correctOut.add(1), amount)
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
        await expect(
          IGainAAVEIRSUser.mintExactA(correctOut, amount.sub(1))
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
      });

      it("Should mintable for b", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const maxOut = mintAmount.add(
          mintAmount
            .mul(fee)
            .mul(poolB)
            .div(poolA.mul(e18).add(mintAmount.mul(fee)))
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.mintB(mintAmount, maxOut);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.add(mintAmount)).equal(
          newContractBaseBalance
        );
        expect(userBBalance.add(maxOut)).equal(newUserBBalance);
        expect(userABalance).equal(newUserABalance);
      });

      it("Should not mintable for b without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.mintB("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("Dai/insufficient-balance")
        );
      });

      it("Should revert when cannot mint b more than desired", async function () {
        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const maxOut = mintAmount.add(
          mintAmount
            .mul(fee)
            .mul(poolB)
            .div(poolA.mul(e18).add(mintAmount.mul(fee)))
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.mintB(mintAmount, maxOut.add(1))
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
      });

      it("Should exact-mintable for b", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctOut = poolB.div(2);
        const r = correctOut.mul(4).mul(poolA).mul(fee).div(e18);
        const x = poolB.sub(correctOut).mul(fee).div(e18).add(poolA);
        const amount = sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await IGainAAVEIRSUser.mintExactB(correctOut, amount);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.add(amount)).equal(newContractBaseBalance);
        expect(userABalance).equal(newUserABalance);
        expect(userBBalance.add(correctOut)).equal(newUserBBalance);
      });

      it("Should revert when cannot mint b as desired", async function () {
        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctOut = poolB.div(2);
        const r = correctOut.mul(4).mul(poolA).mul(fee).div(e18);
        const x = poolB.sub(correctOut).mul(fee).div(e18).add(poolA);
        const amount = sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await expect(
          IGainAAVEIRSUser.mintExactB(correctOut.add(1), amount)
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
        await expect(
          IGainAAVEIRSUser.mintExactB(correctOut, amount.sub(1))
        ).eventually.be.rejectedWith(
          Error,
          getRevertError("SLIPPAGE_DETECTED")
        );
      });

      it("Should mintable for lp", async function () {
        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const [userLPBalance, contractBaseBalance] = await Promise.all([
          IGainAAVEIRS.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.add(mintAmount).mul(poolB.add(mintAmount)));
        const maxOut = k_
          .mul(e18)
          .div(k)
          .sub(e18)
          .mul(totalSupply)
          .div(e18)
          .mul(fee)
          .div(e18);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        await IGainAAVEIRSUser.mintLP(mintAmount, maxOut);

        const [newUserLPBalance, newContractBaseBalance] = await Promise.all([
          IGainAAVEIRS.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);
        expect(contractBaseBalance.add(mintAmount)).equal(
          newContractBaseBalance
        );
        expect(userLPBalance.add(maxOut)).equal(newUserLPBalance);
      });

      it("Should not mintable for lp without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.mintLP("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("Dai/insufficient-balance")
        );
      });

      it("Should revert when cannot mint lp as desired", async function () {
        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.add(mintAmount).mul(poolB.add(mintAmount)));
        const maxOut = k_
          .mul(e18)
          .div(k)
          .sub(e18)
          .mul(totalSupply)
          .div(e18)
          .mul(fee)
          .div(e18);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        await expect(
          IGainAAVEIRSUser.mintLP(mintAmount, maxOut.add(1))
        ).eventually.rejectedWith(Error, "SLIPPAGE_DETECTED");
      });
    });

    describe("Burn functionality", async function () {
      const burnAmount = amount.div(9);

      it("Should burnable for a and b", async function () {
        const [
          userABalance,
          userBBalance,
          contractBaseBalance,
          userBaseBalance,
          protocolFee,
        ] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
          base.balanceOf(user.address),
          IGainAAVEIRS.protocolFee(),
        ]);
        await IGainAAVEIRSUser.burn(burnAmount);

        const [
          newUserABalance,
          newUserBBalance,
          newContractBaseBalance,
          newUserBaseBalance,
        ] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
          base.balanceOf(user.address),
        ]);
        expect(contractBaseBalance.sub(burnAmount)).equal(
          newContractBaseBalance
        );
        expect(userABalance.sub(burnAmount)).equal(newUserABalance);
        expect(userBBalance.sub(burnAmount)).equal(newUserBBalance);
        expect(
          userBaseBalance.add(
            burnAmount.sub(burnAmount.mul(protocolFee).div(e18))
          )
        ).equal(newUserBaseBalance);
      });

      it("Should not burnable for a and b without sufficient balance", async function () {
        await expect(IGainAAVEIRSUser2.burn("1")).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });

      it("Should burnable for a", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctBurn = userABalance.div(10);
        const r = correctBurn.mul(4).mul(poolA).mul(fee).div(e18);
        const x = poolB.sub(correctBurn).mul(fee).div(e18).add(poolA);
        const amount = correctBurn.sub(
          sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee)
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await IGainAAVEIRSUser.burnA(correctBurn, amount);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.sub(amount)).equal(newContractBaseBalance);
        expect(userABalance.sub(correctBurn)).equal(newUserABalance);
        expect(userBBalance).equal(newUserBBalance);
      });

      it("Should revert when cannot get a more than desired from burning a", async function () {
        const [userABalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctBurn = userABalance.div(10);
        const r = correctBurn.mul(4).mul(poolA).mul(fee).div(e18);
        const x = poolB.sub(correctBurn).mul(fee).div(e18).add(poolA);
        const amount = correctBurn.sub(
          sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee)
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await expect(
          IGainAAVEIRSUser.burnA(correctBurn, amount.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not burnable for a without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.burnA("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });

      it("Should burnable for b", async function () {
        const [userABalance, userBBalance, contractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctBurn = userBBalance.div(10);
        const r = correctBurn.mul(4).mul(poolB).mul(fee).div(e18);
        const x = poolA.sub(correctBurn).mul(fee).div(e18).add(poolB);
        const amount = correctBurn.sub(
          sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee)
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        // await IGainAAVEIRSUser.mintA(amount, maxOut);
        await IGainAAVEIRSUser.burnB(correctBurn, amount);

        const [newUserABalance, newUserBBalance, newContractBaseBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            base.balanceOf(IGainAAVEIRS.address),
          ]);
        expect(contractBaseBalance.sub(amount)).equal(newContractBaseBalance);
        expect(userABalance).equal(newUserABalance);
        expect(userBBalance.sub(correctBurn)).equal(newUserBBalance);
      });

      it("Should revert when cannot get a more than desired from burning b", async function () {
        const [userBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);
        const correctBurn = userBBalance.div(10);
        const r = correctBurn.mul(4).mul(poolB).mul(fee).div(e18);
        const x = poolA.sub(correctBurn).mul(fee).div(e18).add(poolB);
        const amount = correctBurn.sub(
          sqrt(x.pow(2).add(r)).sub(x).mul(e18).div(2).div(fee)
        );

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        await expect(
          IGainAAVEIRSUser.burnB(correctBurn, amount.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not burnable for b without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.burnB("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });

      it("Should burnable for lp", async function () {
        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const [userLPBalance, contractBaseBalance] = await Promise.all([
          IGainAAVEIRS.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);

        const lp = userLPBalance.div(10);
        const f = fee.mul(lp).div(totalSupply);
        const amount = poolA
          .add(poolB)
          .sub(
            sqrt(
              poolA
                .add(poolB)
                .pow(2)
                .sub(
                  poolA
                    .mul(poolB)
                    .mul(4)
                    .mul(f)
                    .div(e18)
                    .mul(e18.mul(2).sub(f))
                    .div(e18)
                )
            )
          )
          .div(2);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        await IGainAAVEIRSUser.burnLP(lp, amount);

        const [newUserLPBalance, newContractBaseBalance] = await Promise.all([
          IGainAAVEIRS.balanceOf(user.address),
          base.balanceOf(IGainAAVEIRS.address),
        ]);
        expect(contractBaseBalance.sub(amount)).equal(newContractBaseBalance);
        expect(userLPBalance.sub(lp)).equal(newUserLPBalance);
      });

      it("Should revert when cannot get a more than desired from burning lp", async function () {
        const [
          userLPBalance,
          openTime,
          closeTime,
          minFee,
          maxFee,
          poolA,
          poolB,
          totalSupply,
        ] = await Promise.all([
          IGainAAVEIRS.balanceOf(user.address),
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
          IGainAAVEIRS.totalSupply(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const lp = userLPBalance.div(10);
        const f = fee.mul(lp).div(totalSupply);
        const amount = poolA
          .add(poolB)
          .sub(
            sqrt(
              poolA
                .add(poolB)
                .pow(2)
                .sub(
                  poolA
                    .mul(poolB)
                    .mul(4)
                    .mul(f)
                    .div(e18)
                    .mul(e18.mul(2).sub(f))
                    .div(e18)
                )
            )
          )
          .div(2);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);

        await expect(
          IGainAAVEIRSUser.burnLP(lp, amount.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not burnable for lp without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.burnLP("1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });
    });

    describe("Swap functionality", async function () {
      it("Should swapable from a to b", async function () {
        const [userABalance, userBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);

        const a = userABalance.div(10);
        const expectedB = a
          .mul(fee)
          .mul(poolB)
          .div(poolA.mul(e18).add(a.mul(fee)));

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.swapAtoB(a, expectedB);

        const [newUserABalance, newUserBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
        ]);
        expect(userABalance.sub(a)).equal(newUserABalance);
        expect(userBBalance.add(expectedB)).equal(newUserBBalance);
      });

      it("Should revert when cannot swap more b than desired", async function () {
        const [userABalance] = await Promise.all([
          aContract.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);

        const a = userABalance.div(10);
        const expectedB = a
          .mul(fee)
          .mul(poolB)
          .div(poolA.mul(e18).add(a.mul(fee)));

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.swapAtoB(a, expectedB.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not swapable from a to b without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.swapAtoB("1", 0)
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });

      it("Should swapable from b to a", async function () {
        const [userABalance, userBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);

        const b = userBBalance.div(10);
        const expectedA = b
          .mul(fee)
          .mul(poolA)
          .div(poolB.mul(e18).add(b.mul(fee)));

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.swapBtoA(b, expectedA);

        const [newUserABalance, newUserBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
        ]);
        expect(userABalance.add(expectedA)).equal(newUserABalance);
        expect(userBBalance.sub(b)).equal(newUserBBalance);
      });

      it("Should revert when cannot swap more a than desired", async function () {
        const [userBBalance] = await Promise.all([
          bContract.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee] = await Promise.all([
          IGainAAVEIRS.openTime(),
          IGainAAVEIRS.closeTime(),
          IGainAAVEIRS.minFee(),
          IGainAAVEIRS.maxFee(),
        ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);
        const [poolA, poolB] = await Promise.all([
          IGainAAVEIRS.poolA(),
          IGainAAVEIRS.poolB(),
        ]);

        const b = userBBalance.div(10);
        const expectedA = b
          .mul(fee)
          .mul(poolA)
          .div(poolB.mul(e18).add(b.mul(fee)));

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.swapBtoA(b, expectedA.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not swapable from b to a without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.swapAtoB("1", 0)
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });
    });

    describe("LP functionality", async function () {
      it("Should depositable", async function () {
        const [userABalance, userBBalance, userLPBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          IGainAAVEIRSUser.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const aIn = userABalance.div(10);
        const bIn = userBBalance.div(10);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.add(aIn).mul(poolB.add(bIn)));
        const lp = k_
          .mul(e18)
          .div(k)
          .sub(e18)
          .mul(totalSupply)
          .div(e18)
          .mul(fee)
          .div(e18);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.depositLP(aIn, bIn, lp);

        const [newUserABalance, newUserBBalance, newUserLPBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            IGainAAVEIRSUser.balanceOf(user.address),
          ]);
        expect(userABalance.sub(aIn)).equal(newUserABalance);
        expect(userBBalance.sub(bIn)).equal(newUserBBalance);
        expect(userLPBalance.add(lp)).equal(newUserLPBalance);
      });

      it("Shoud revert when cannot get more lp than desired from deposit", async function () {
        const [userABalance, userBBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const aIn = userABalance.div(10);
        const bIn = userBBalance.div(10);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.add(aIn).mul(poolB.add(bIn)));
        const lp = k_
          .mul(e18)
          .div(k)
          .sub(e18)
          .mul(totalSupply)
          .div(e18)
          .mul(fee)
          .div(e18);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.depositLP(aIn, bIn, lp.add(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not depositable without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.depositLP("1", "1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });

      it("Should withdrawable", async function () {
        const [userABalance, userBBalance, userLPBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          IGainAAVEIRSUser.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const aIn = userABalance.div(10);
        const bIn = userBBalance.div(10);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.sub(aIn).mul(poolB.sub(bIn)));
        const lp = e18
          .sub(k_.mul(e18).div(k))
          .mul(totalSupply)
          .div(e18)
          .mul(e18)
          .div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await IGainAAVEIRSUser.withdrawLP(aIn, bIn, lp);

        const [newUserABalance, newUserBBalance, newUserLPBalance] =
          await Promise.all([
            aContract.balanceOf(user.address),
            bContract.balanceOf(user.address),
            IGainAAVEIRSUser.balanceOf(user.address),
          ]);
        expect(userABalance.add(aIn)).equal(newUserABalance);
        expect(userBBalance.add(bIn)).equal(newUserBBalance);
        expect(userLPBalance.sub(lp)).equal(newUserLPBalance);
      });

      it("Shoud revert when cannot get more base token than desired from withdraw", async function () {
        const [userABalance, userBBalance, userLPBalance] = await Promise.all([
          aContract.balanceOf(user.address),
          bContract.balanceOf(user.address),
          IGainAAVEIRSUser.balanceOf(user.address),
        ]);

        const [openTime, closeTime, minFee, maxFee, poolA, poolB, totalSupply] =
          await Promise.all([
            IGainAAVEIRS.openTime(),
            IGainAAVEIRS.closeTime(),
            IGainAAVEIRS.minFee(),
            IGainAAVEIRS.maxFee(),
            IGainAAVEIRS.poolA(),
            IGainAAVEIRS.poolB(),
            IGainAAVEIRS.totalSupply(),
          ]);
        timeGap += 10;
        const txTime = openTime.add(timeGap);
        const fee = getFee(openTime, closeTime, txTime, minFee, maxFee);

        const aIn = userABalance.div(10);
        const bIn = userBBalance.div(10);

        const k = sqrt(poolA.mul(poolB));
        const k_ = sqrt(poolA.sub(aIn).mul(poolB.sub(bIn)));
        const lp = e18
          .sub(k_.mul(e18).div(k))
          .mul(totalSupply)
          .div(e18)
          .mul(e18)
          .div(fee);

        network.provider.send("evm_setNextBlockTimestamp", [txTime.toNumber()]);
        await expect(
          IGainAAVEIRSUser.withdrawLP(aIn, bIn, lp.sub(1))
        ).eventually.be.rejectedWith(getRevertError("SLIPPAGE_DETECTED"));
      });

      it("Should not withdrawable without sufficient balance", async function () {
        await expect(
          IGainAAVEIRSUser2.depositLP("1", "1", "0")
        ).eventually.be.rejectedWith(
          getRevertError("ERC20: burn amount exceeds balance")
        );
      });
    });

    it("Should not claimable", async function () {
      await expect(IGainAAVEIRSUser.claim()).eventually.be.rejectedWith(
        getRevertError("Not yet")
      );
    });
  });

  describe("After close time", async function () {
    before(async function () {
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
    });

    it("Fee should be max", async function () {
      const [fee, maxFee] = await Promise.all([
        IGainAAVEIRS.fee(),
        IGainAAVEIRS.maxFee(),
      ]);

      expect(e18.sub(fee)).equal(maxFee);
    });

    it("Should closable after duration", async function () {
      await expect(IGainAAVEIRS.close()).eventually.be.fulfilled;
    });

    it("Should re-closable after closed", async function () {
      await expect(IGainAAVEIRS.close()).eventually.be.rejected;
    });

    it("Should claimable", async function () {
      const [
        userABalance,
        userBBalance,
        userLPBalance,
        poolA,
        poolB,
        totalSupply,
        bPrice,
        userBaseBalance,
        protocolFee,
      ] = await Promise.all([
        aContract.balanceOf(user.address),
        bContract.balanceOf(user.address),
        IGainAAVEIRSUser.balanceOf(user.address),
        IGainAAVEIRSUser.poolA(),
        IGainAAVEIRSUser.poolB(),
        IGainAAVEIRSUser.totalSupply(),
        IGainAAVEIRSUser.bPrice(),
        base.balanceOf(user.address),
        IGainAAVEIRSUser.protocolFee(),
      ]);

      const da = poolA.mul(userLPBalance).div(totalSupply);
      const db = poolB.mul(userLPBalance).div(totalSupply);
      const amount = userABalance
        .add(da)
        .mul(e18.sub(bPrice))
        .add(userBBalance.add(db).mul(bPrice))
        .div(e18);
      const fee = amount.mul(protocolFee).div(e18);

      await IGainAAVEIRSUser.claim();

      const newUserBaseBalance = await base.balanceOf(user.address);
      expect(userBaseBalance.add(amount.sub(fee))).equal(newUserBaseBalance);
    });
  });
});
