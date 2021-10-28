import { expect, use } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Signer, constants, utils } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { ERC20Mintable } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

use(chaiAsPromised);

describe("ERC20Mintable", function () {
  const testAmountUnit = BigNumber.from("100000000000");
  let ERC20: ERC20Mintable;
  let ERC20Owner: ERC20Mintable;
  let ERC20User: ERC20Mintable;
  let ERC20Spender: ERC20Mintable;
  let accounts: SignerWithAddress[];
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let spender: SignerWithAddress;

  before(async function () {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    user = accounts[1];
    spender = accounts[2];
    const ERC20MintableDeployer = await ethers.getContractFactory(
      "ERC20Mintable"
    );
    ERC20 = await ERC20MintableDeployer.deploy();

    await ERC20.deployed();
  });

  describe("Init", async function () {
    it("Should initable", async function () {
      await ERC20.init(owner.address, "Test Token", "TT", 18);

      ERC20Owner = ERC20.connect(owner);
      ERC20User = ERC20.connect(user);
      ERC20Spender = ERC20.connect(spender);
    });

    it("Should not re-initable", async function () {
      await expect(ERC20.init(owner.address, "Test Token", "TT", 18)).eventually
        .be.rejected;
    });
  });

  describe("Functionality", async function () {
    it("Should be mintable and burnable for owner", async function () {
      const mintAmount = testAmountUnit.mul(3);
      const burnAmount = testAmountUnit;
      const [initialSupply, initialBalance] = await Promise.all([
        await ERC20Owner.totalSupply(),
        await ERC20Owner.balanceOf(user.address),
      ]);

      const mintTx = await ERC20Owner.mint(user.address, mintAmount);
      const mintReceipt = await mintTx.wait();

      expect(mintReceipt.events).to.have.lengthOf(1);
      expect(
        mintReceipt.events?.filter((e) => e.event === "Transfer")
      ).to.have.lengthOf(1);
      expect(mintReceipt.events?.[0].args?.from).equal(constants.AddressZero);
      expect(mintReceipt.events?.[0].args?.to).equal(user.address);
      expect(mintReceipt.events?.[0].args?.value).equal(mintAmount);

      const [afterMintSupply, afterMintBalance] = await Promise.all([
        await ERC20Owner.totalSupply(),
        await ERC20Owner.balanceOf(user.address),
      ]);
      expect(initialSupply.add(mintAmount)).equal(afterMintSupply);
      expect(initialBalance.add(mintAmount)).equal(afterMintBalance);

      const burnTx = await ERC20Owner.burn(user.address, burnAmount);
      const burnReceipt = await burnTx.wait();

      expect(burnReceipt.events).to.have.lengthOf(1);
      expect(
        burnReceipt.events?.filter((e) => e.event === "Transfer")
      ).to.have.lengthOf(1);
      expect(burnReceipt.events?.[0].args?.to).equal(constants.AddressZero);
      expect(burnReceipt.events?.[0].args?.from).equal(user.address);
      expect(burnReceipt.events?.[0].args?.value).equal(burnAmount);

      const [afterBurnSupply, afterBurnBalance] = await Promise.all([
        await ERC20Owner.totalSupply(),
        await ERC20Owner.balanceOf(user.address),
      ]);
      expect(afterMintSupply.sub(burnAmount)).equal(afterBurnSupply);
      expect(afterMintBalance.sub(burnAmount)).equal(afterBurnBalance);
    });

    it("Should be transferable", async function () {
      const transferAmount = testAmountUnit;
      const target = utils.getAddress(
        "0x0123456789abcdef000000000000000000000000"
      );
      const [senderBalance, receiverBalance] = await Promise.all([
        ERC20.balanceOf(target),
        ERC20.balanceOf(user.address),
      ]);

      const transferTx = await ERC20User.transfer(target, transferAmount);
      const transferReceipt = await transferTx.wait();

      expect(transferReceipt.events).to.have.lengthOf(1);
      expect(
        transferReceipt.events?.filter((e) => e.event === "Transfer")
      ).to.have.lengthOf(1);
      expect(transferReceipt.events?.[0].args?.from).equal(user.address);
      expect(transferReceipt.events?.[0].args?.to).equal(target);
      expect(transferReceipt.events?.[0].args?.value).equal(transferAmount);

      const [newSenderBalance, newReceiverBalance] = await Promise.all([
        ERC20.balanceOf(target),
        ERC20.balanceOf(user.address),
      ]);
      expect(senderBalance.add(transferAmount)).equal(newSenderBalance);
      expect(receiverBalance.sub(transferAmount)).equal(newReceiverBalance);
    });

    it("Should be approvable and transferable for target", async function () {
      const approveAmount = testAmountUnit;
      const target = utils.getAddress(
        "0x0123456789abcdef000000000000000000000000"
      );
      const [senderBalance, receiverBalance, initialAllowance] =
        await Promise.all([
          ERC20.balanceOf(target),
          ERC20.balanceOf(user.address),
          ERC20.allowance(user.address, spender.address),
        ]);

      const approveTx = await ERC20User.approve(spender.address, approveAmount);
      const approveReceipt = await approveTx.wait();
      const afterApproveAllowance = await ERC20.allowance(
        user.address,
        spender.address
      );

      expect(approveReceipt.events).to.have.lengthOf(1);
      expect(
        approveReceipt.events?.filter((e) => e.event === "Approval")
      ).to.have.lengthOf(1);
      expect(approveReceipt.events?.[0].args?.owner).equal(user.address);
      expect(approveReceipt.events?.[0].args?.spender).equal(spender.address);
      expect(approveReceipt.events?.[0].args?.value).equal(approveAmount);
      expect(initialAllowance.add(approveAmount)).equal(afterApproveAllowance);

      const transferFromTx = await ERC20Spender.transferFrom(
        user.address,
        target,
        approveAmount
      );
      const transferFromReceipt = await transferFromTx.wait();

      expect(transferFromReceipt.events).to.have.lengthOf(2);

      expect(
        transferFromReceipt.events?.filter((e) => e.event === "Transfer")
      ).to.have.lengthOf(1);
      expect(
        transferFromReceipt.events?.filter((e) => e.event === "Approval")
      ).to.have.lengthOf(1);

      const transferEvent = transferFromReceipt.events?.find(
        (e) => e.event === "Transfer"
      );
      expect(transferEvent?.args?.from).equal(user.address);
      expect(transferEvent?.args?.to).equal(target);
      expect(transferEvent?.args?.value).equal(approveAmount);

      const approveEvent = transferFromReceipt.events?.find(
        (e) => e.event === "Approval"
      );
      expect(approveEvent?.args?.owner).equal(user.address);
      expect(approveEvent?.args?.spender).equal(spender.address);
      expect(approveEvent?.args?.value).equal(BigNumber.from(0));

      const [newSenderBalance, newReceiverBalance, newAllowance] =
        await Promise.all([
          ERC20.balanceOf(target),
          ERC20.balanceOf(user.address),
          ERC20.allowance(user.address, spender.address),
        ]);
      expect(senderBalance.add(approveAmount)).equal(newSenderBalance);
      expect(receiverBalance.sub(approveAmount)).equal(newReceiverBalance);
      expect(afterApproveAllowance.sub(approveAmount)).equal(newAllowance);
    });

    it("Should not be mintable or burnable for user", async function () {
      const mintAmount = testAmountUnit;
      await expect(ERC20User.mint(user.address, mintAmount)).to.eventually.be
        .rejected;

      await expect(ERC20User.burn(user.address, mintAmount)).to.eventually.be
        .rejected;
    });

    it("Should not be transferable without sufficient balance", async function () {
      const userBalance = await ERC20Owner.balanceOf(user.address);
      const transferAmount = userBalance.add("1");
      const target = utils.getAddress(
        "0x0123456789abcdef000000000000000000000000"
      );
      await expect(ERC20User.transfer(target, transferAmount)).to.eventually.be
        .rejected;
    });

    it("Should not be transferable without approve or sufficient balance", async function () {
      const approveAmount = testAmountUnit;
      const transferAmount = approveAmount.add(1);
      const target = utils.getAddress(
        "0x0123456789abcdef000000000000000000000000"
      );
      await expect(
        ERC20Spender.transferFrom(user.address, target, transferAmount)
      ).to.eventually.be.rejected;

      await ERC20User.approve(spender.address, approveAmount);
      await expect(
        ERC20Spender.transferFrom(user.address, target, transferAmount)
      ).to.eventually.be.rejected;
    });
  });
});
