# ImpermanentGain
The antiparticle of impermanent loss

## Commands

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/sample-script.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Remix Setup
1. Run `npm run serve`  
This will start `remixd` that installed with `npm install`
2. Open [Remix IDE](https://remix.ethereum.org/)
3. Activate `Remixd` plugin, then you can access codes now
4. It's recommand not to check `Auto Compile` and `Enable Hardhat Compilation` at the same time
5. If errors saying writing conflicts on metadatas keep popping, turn off `Generate contract metadata` in Setting may help

# Local node setup
1. Create or modify `.env`, set `FORKING_URL` to a endpoint
2. Run `npx hardhat node`
3. Now you can connect to localhost:8545 and that will fork the state of mainnet
4. You can activate `Hardhat Provider` plugin in remix and select `Hardhat Provider` in Environment to deploy
5. To lock the forking block, umcomment the `blockNumber` config in `hardhat.config.ts` and change it