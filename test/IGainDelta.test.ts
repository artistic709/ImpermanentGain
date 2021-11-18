import { expect, use } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { ERC20Mintable, IGainDelta } from "../typechain";
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

describe("IGainDelta", function () {
  const amount = BigNumber.from(parseUnits("10000"));
  let IGainDelta: IGainDelta;
  let accounts: SignerWithAddress[];
  let operator: SignerWithAddress;
  let base: ERC20Mintable;
  let aContract: ERC20Mintable;
  let bContract: ERC20Mintable;

  // Init configs
  const baseToken = getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F");
  const oracle = getAddress("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
  const treasury = getAddress("0x83D0D842e6DB3B020f384a2af11bD14787BEC8E7");
  const batchName = "Delta-ETHUSD";
  const leverage = BigNumber.from("2000000000000000000");
  const duration = BigNumber.from("86400");
  const a = BigNumber.from("1000000000000000000");
  const b = BigNumber.from("500000000000000000");

  before(async function () {
    accounts = await ethers.getSigners();
    operator = accounts[0];

    const IGainDeltaDeployer = await ethers.getContractFactory("IGainDelta");
    IGainDelta = await IGainDeltaDeployer.deploy();
    await IGainDelta.deployed();

    base = await ethers.getContractAt(
      "ERC20Mintable",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI
    );
    const basePool = base.connect(
      await getSigner("0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7") // Curve Pool
    );
    await basePool.transfer(operator.address, amount);
    await base.approve(IGainDelta.address, amount);
  });

  describe("Init", async function () {
    it("Should initable", async function () {
      await IGainDelta.init(
        baseToken,
        oracle,
        treasury,
        batchName,
        leverage,
        duration,
        a,
        b
      );

      const [
        resultBaseToken,
        resultOracle,
        resultTreasury,
        resultLeverage,
        resultOpenTime,
        resultCloseTime,
        resultA,
        resultB,
      ] = await Promise.all([
        IGainDelta.baseToken(),
        IGainDelta.oracle(),
        IGainDelta.treasury(),
        IGainDelta.leverage(),
        IGainDelta.openTime(),
        IGainDelta.closeTime(),
        IGainDelta.a(),
        IGainDelta.b(),
      ]);

      expect(baseToken).equal(resultBaseToken);
      expect(oracle).equal(resultOracle);
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
        IGainDelta.init(
          baseToken,
          oracle,
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
    describe("Should not closable", async function () {
      it("Should not closable", async function () {
        await expect(IGainDelta.close()).eventually.be.rejectedWith("Not yet");
      });
    });
  });

  describe("After close time", async function () {
    before(async function () {
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
    });

    it("Fee should be min", async function () {
      const [fee, minFee] = await Promise.all([
        IGainDelta.fee(),
        IGainDelta.minFee(),
      ]);

      expect(e18.sub(fee)).equal(minFee);
    });

    it("Should closable after duration", async function () {
      await expect(IGainDelta.close()).eventually.be.fulfilled;
    });

    it("Should re-closable after closed", async function () {
      await expect(IGainDelta.close()).eventually.be.rejectedWith(
        getRevertError("Closed")
      );
    });
  });

  describe("Calc Delta", async function () {
    it("Should correct", async function () {
      const [leverage, openPrice, closePrice] = await Promise.all([
        IGainDelta.leverage(),
        IGainDelta.openPrice(),
        IGainDelta.closePrice(),
      ]);

      const resultA = await IGainDelta.calcDelta(
        leverage,
        openPrice,
        closePrice.add("10000000000000")
      );
      const resultB = await IGainDelta.calcDelta(
        leverage,
        openPrice,
        closePrice
      );

      function getDelta(l: BigNumber, a: BigNumber, x: BigNumber) {
        if (x.gte(a)) {
          const numerator = x.sub(a).mul(l).div(e18);
          const denominator = sqrt(a.pow(2).add(numerator.pow(2))).mul(2);
          return e18.div(2).add(numerator.mul(e18).div(denominator));
        }
        const numerator = a.sub(x).mul(l).div(e18);
        const denominator = sqrt(a.pow(2).add(numerator.pow(2))).mul(2);
        return e18.div(2).sub(numerator.mul(e18).div(denominator));
      }

      expect(resultA).equal(
        getDelta(leverage, openPrice, closePrice.add("10000000000000"))
      );
      expect(resultB).equal(getDelta(leverage, openPrice, closePrice));
    });
  });
});
