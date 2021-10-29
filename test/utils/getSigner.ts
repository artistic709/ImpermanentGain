import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export default async function getSigner(
  address: string
): Promise<SignerWithAddress> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  await network.provider.request({
    method: "hardhat_setBalance",
    params: [address, "0x10000000000000000000"],
  });
  return ethers.getSigner(address);
}
