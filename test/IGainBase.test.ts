import { ContractFactory } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IGainBase, IGainBase__factory } from "../typechain";

describe("IGainBase", function () {
  let IGainBaseFactory: IGainBase__factory & ContractFactory;
  let IGainBaseContract: IGainBase;

  before(async () => {
    IGainBaseFactory = (await ethers.getContractFactory(
      "IGainBase"
    )) as unknown as IGainBase__factory & ContractFactory;
    IGainBaseContract = (await IGainBaseFactory.deploy()) as IGainBase;
    await IGainBaseContract.deployed();
  });

  it("Should not be buyable", async function () {
    expect(await IGainBaseContract.canBuy()).to.equal(false);
  });
});
