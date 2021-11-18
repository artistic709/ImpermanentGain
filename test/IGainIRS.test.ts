import { expect, use } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { ERC20Mintable, IGainYearnIRS } from "../typechain";
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
  if (closeTime.lte(openTime)) return e18.sub(minFee);
  return e18.sub(
    maxFee.sub(
      maxFee.sub(minFee).mul(txTime.sub(openTime)).div(closeTime.sub(openTime))
    )
  );
}

describe("IGainYearnIRS", function () {
  const amount = BigNumber.from(parseUnits("10000"));
  let IGainYearnIRS: IGainYearnIRS;
  let accounts: SignerWithAddress[];
  let operator: SignerWithAddress;
  let base: ERC20Mintable;
  let aContract: ERC20Mintable;
  let bContract: ERC20Mintable;

  // Init configs
  const baseToken = getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F");
  const vault = getAddress("0xdA816459F1AB5631232FE5e97a05BBBb94970c95");
  const treasury = getAddress("0x83D0D842e6DB3B020f384a2af11bD14787BEC8E7");
  const batchName = "IRS-yvDAI";
  const leverage = BigNumber.from("5000000000000000000");
  const duration = BigNumber.from("86400");
  const a = BigNumber.from("1000000000000000000");
  const b = BigNumber.from("1000000000000000000");

  before(async function () {
    accounts = await ethers.getSigners();
    operator = accounts[0];

    const IGainYearnIRSDeployer = await ethers.getContractFactory(
      "IGainYearnIRS"
    );
    IGainYearnIRS = await IGainYearnIRSDeployer.deploy();
    await IGainYearnIRS.deployed();

    base = await ethers.getContractAt(
      "ERC20Mintable",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI
    );
    const basePool = base.connect(
      await getSigner("0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7") // Curve Pool
    );
    await basePool.transfer(operator.address, amount);
    await base.approve(IGainYearnIRS.address, amount);
  });

  describe("Init", async function () {
    it("Should initable", async function () {
      await IGainYearnIRS.init(
        baseToken,
        vault,
        treasury,
        batchName,
        leverage,
        duration,
        a,
        b
      );

      const [
        resultBaseToken,
        resultVault,
        resultTreasury,
        resultLeverage,
        resultOpenTime,
        resultCloseTime,
        resultA,
        resultB,
      ] = await Promise.all([
        IGainYearnIRS.baseToken(),
        IGainYearnIRS.vault(),
        IGainYearnIRS.treasury(),
        IGainYearnIRS.leverage(),
        IGainYearnIRS.openTime(),
        IGainYearnIRS.closeTime(),
        IGainYearnIRS.a(),
        IGainYearnIRS.b(),
      ]);

      expect(baseToken).equal(resultBaseToken);
      expect(vault).equal(resultVault);
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
        IGainYearnIRS.init(
          baseToken,
          vault,
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
    it("Fee should correct", async function () {
      const [openTime, closeTime, minFee, maxFee] = await Promise.all([
        IGainYearnIRS.openTime(),
        IGainYearnIRS.closeTime(),
        IGainYearnIRS.minFee(),
        IGainYearnIRS.maxFee(),
      ]);
      const txTime = openTime.add(10);
      const expectedFee = getFee(openTime, closeTime, txTime, minFee, maxFee);

      await network.provider.send("evm_setNextBlockTimestamp", [
        txTime.toNumber(),
      ]);
      await network.provider.send("evm_mine");
      const realFee = await IGainYearnIRS.fee();
      expect(expectedFee).equal(realFee);
    });

    it("Should not closable", async function () {
      await expect(IGainYearnIRS.close()).eventually.be.rejectedWith("Not yet");
    });
  });

  describe("After close time", async function () {
    before(async function () {
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
    });

    it("Fee should be min", async function () {
      const [fee, minFee] = await Promise.all([
        IGainYearnIRS.fee(),
        IGainYearnIRS.minFee(),
      ]);

      expect(e18.sub(fee)).equal(minFee);
    });

    it("Should closable after duration", async function () {
      await expect(IGainYearnIRS.close()).eventually.be.fulfilled;
    });

    it("Should re-closable after closed", async function () {
      await expect(IGainYearnIRS.close()).eventually.be.rejectedWith(
        getRevertError("Closed")
      );
    });
  });
});
