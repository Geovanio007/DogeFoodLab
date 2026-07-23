import { createPublicClient, http, formatUnits, decodeEventLog } from 'viem';
import { dogeOSDevnet } from '../config/wagmi';
import { 
  CONTRACT_ADDRESSES, 
  LAB_TOKEN_ABI, 
  DOGEFOOD_NFT_ABI, 
  REWARD_DISTRIBUTOR_ABI,
  LAUNCHPAD_FACTORY_ABI,
  BONDING_CURVE_ABI,
  LAUNCH_TOKEN_ABI,
} from '../config/contracts';

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain: dogeOSDevnet,
  transport: http()
});

export class BlockchainService {
  constructor() {
    this.client = publicClient;
  }

  // LAB Token Functions
  async getLabBalance(address) {
    try {
      const balance = await this.client.readContract({
        address: CONTRACT_ADDRESSES.LAB_TOKEN,
        abi: LAB_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      // Convert from wei to LAB tokens (18 decimals)
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting LAB balance:', error);
      return '0';
    }
  }

  async getLabTokenInfo() {
    try {
      const [symbol, decimals, totalSupply] = await Promise.all([
        this.client.readContract({
          address: CONTRACT_ADDRESSES.LAB_TOKEN,
          abi: LAB_TOKEN_ABI,
          functionName: 'symbol'
        }),
        this.client.readContract({
          address: CONTRACT_ADDRESSES.LAB_TOKEN,
          abi: LAB_TOKEN_ABI,
          functionName: 'decimals'
        }),
        this.client.readContract({
          address: CONTRACT_ADDRESSES.LAB_TOKEN,
          abi: LAB_TOKEN_ABI,
          functionName: 'totalSupply'
        })
      ]);

      return {
        symbol,
        decimals,
        totalSupply: formatUnits(totalSupply, decimals),
        address: CONTRACT_ADDRESSES.LAB_TOKEN
      };
    } catch (error) {
      console.error('Error getting LAB token info:', error);
      return null;
    }
  }

  // DogeFood NFT Functions
  async getNftBalance(address) {
    try {
      const balance = await this.client.readContract({
        address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
        abi: DOGEFOOD_NFT_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      return Number(balance);
    } catch (error) {
      console.error('Error getting NFT balance:', error);
      return 0;
    }
  }

  async getNftTotalSupply() {
    try {
      const totalSupply = await this.client.readContract({
        address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
        abi: DOGEFOOD_NFT_ABI,
        functionName: 'totalSupply'
      });
      
      return Number(totalSupply);
    } catch (error) {
      console.error('Error getting NFT total supply:', error);
      return 0;
    }
  }

  async getNftCollectionInfo() {
    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.client.readContract({
          address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
          abi: DOGEFOOD_NFT_ABI,
          functionName: 'name'
        }),
        this.client.readContract({
          address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
          abi: DOGEFOOD_NFT_ABI,
          functionName: 'symbol'
        }),
        this.client.readContract({
          address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
          abi: DOGEFOOD_NFT_ABI,
          functionName: 'totalSupply'
        })
      ]);

      return {
        name,
        symbol,
        totalSupply: Number(totalSupply),
        maxSupply: 420,
        address: CONTRACT_ADDRESSES.DOGEFOOD_NFT
      };
    } catch (error) {
      console.error('Error getting NFT collection info:', error);
      return null;
    }
  }

  // Check if user owns any NFTs
  async isNftHolder(address) {
    const balance = await this.getNftBalance(address);
    return balance > 0;
  }

  // Reward Distributor Functions
  async getCurrentSeason() {
    try {
      const currentSeason = await this.client.readContract({
        address: CONTRACT_ADDRESSES.REWARD_DISTRIBUTOR,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'currentSeason'
      });
      
      return Number(currentSeason);
    } catch (error) {
      console.error('Error getting current season:', error);
      return 0;
    }
  }

  async hasClaimedReward(seasonId, address) {
    try {
      const hasClaimed = await this.client.readContract({
        address: CONTRACT_ADDRESSES.REWARD_DISTRIBUTOR,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'hasClaimedSeason',
        args: [seasonId, address]
      });
      
      return hasClaimed;
    } catch (error) {
      console.error('Error checking reward claim status:', error);
      return false;
    }
  }

  // Utility Functions
  getExplorerUrl(address) {
    return `${dogeOSDevnet.blockExplorers.default.url}/address/${address}`;
  }

  getTxUrl(txHash) {
    return `${dogeOSDevnet.blockExplorers.default.url}/tx/${txHash}`;
  }

  // Get user's complete Web3 profile
  async getUserWeb3Profile(address) {
    try {
      const [labBalance, nftBalance, isHolder, currentSeason] = await Promise.all([
        this.getLabBalance(address),
        this.getNftBalance(address),
        this.isNftHolder(address),
        this.getCurrentSeason()
      ]);

      return {
        address,
        labBalance,
        nftBalance,
        isNftHolder: isHolder,
        currentSeason,
        explorerUrl: this.getExplorerUrl(address)
      };
    } catch (error) {
      console.error('Error getting user Web3 profile:', error);
      return null;
    }
  }

  // NFT Minting Function (requires wallet client)
  async mintTreatNFT(walletClient, userAddress) {
    try {
      console.log('🎨 Minting DogeFood NFT for treat creation...');
      
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.DOGEFOOD_NFT,
        abi: DOGEFOOD_NFT_ABI,
        functionName: 'mintTreat',
        args: [userAddress],
        account: userAddress,
      });

      console.log('✅ NFT mint transaction sent:', txHash);
      
      // Wait for transaction confirmation
      const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });
      
      console.log('✅ NFT minted successfully! Transaction:', receipt);
      
      return {
        success: true,
        txHash,
        receipt,
        explorerUrl: this.getTxUrl(txHash)
      };
    } catch (error) {
      console.error('❌ Error minting NFT:', error);
      return {
        success: false,
        error: error.message || 'Failed to mint NFT'
      };
    }
  }

  // Lab Launcher: create a new token via LaunchpadFactory. Free to call
  // beyond gas - the full fixed supply mints straight to BondingCurve,
  // no separate approval/allocation step needed.
  async createLabLauncherToken(walletClient, userAddress, name, symbol) {
    try {
      console.log(`🚀 Creating Lab Launcher token "${name}" (${symbol})...`);

      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LAUNCHPAD_FACTORY,
        abi: LAUNCHPAD_FACTORY_ABI,
        functionName: 'createToken',
        args: [name, symbol],
        account: userAddress,
      });

      console.log('✅ Create-token transaction sent:', txHash);

      const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });

      // createToken's return value isn't reachable from a transaction
      // receipt directly - the new token's address comes from decoding
      // the TokenLaunched event this same transaction emits.
      let tokenAddress = null;
      for (const log of receipt.logs) {
        if (log.address?.toLowerCase() !== CONTRACT_ADDRESSES.LAUNCHPAD_FACTORY.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: LAUNCHPAD_FACTORY_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'TokenLaunched') {
            tokenAddress = decoded.args.token;
            break;
          }
        } catch {
          // not the log we're looking for
        }
      }

      if (!tokenAddress) {
        throw new Error('Token deployed, but the TokenLaunched event was not found in the receipt.');
      }

      console.log('✅ Token created at:', tokenAddress);

      return {
        success: true,
        txHash,
        tokenAddress,
        receipt,
        explorerUrl: this.getTxUrl(txHash),
      };
    } catch (error) {
      console.error('❌ Error creating Lab Launcher token:', error);
      return {
        success: false,
        error: error.shortMessage || error.message || 'Failed to create token',
      };
    }
  }

  // -- Lab Launcher trading --------------------------------------------

  async previewBuy(token, dogeInWei) {
    try {
      const [tokensOut, fee] = await this.client.readContract({
        address: CONTRACT_ADDRESSES.BONDING_CURVE,
        abi: BONDING_CURVE_ABI,
        functionName: 'previewBuy',
        args: [token, dogeInWei],
      });
      return { tokensOut, fee };
    } catch (error) {
      console.error('Error previewing buy:', error);
      return null;
    }
  }

  async previewSell(token, tokenInWei) {
    try {
      const [dogeOut, fee] = await this.client.readContract({
        address: CONTRACT_ADDRESSES.BONDING_CURVE,
        abi: BONDING_CURVE_ABI,
        functionName: 'previewSell',
        args: [token, tokenInWei],
      });
      return { dogeOut, fee };
    } catch (error) {
      console.error('Error previewing sell:', error);
      return null;
    }
  }

  async getTokenBalance(token, owner) {
    try {
      return await this.client.readContract({
        address: token,
        abi: LAUNCH_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [owner],
      });
    } catch (error) {
      console.error('Error reading token balance:', error);
      return 0n;
    }
  }

  async getTokenAllowance(token, owner) {
    try {
      return await this.client.readContract({
        address: token,
        abi: LAUNCH_TOKEN_ABI,
        functionName: 'allowance',
        args: [owner, CONTRACT_ADDRESSES.BONDING_CURVE],
      });
    } catch (error) {
      console.error('Error reading token allowance:', error);
      return 0n;
    }
  }

  // Buy: send native DOGE, get the token back. minTokensOut should already
  // include the caller's slippage tolerance.
  async buyToken(walletClient, userAddress, token, dogeAmountWei, minTokensOut) {
    try {
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.BONDING_CURVE,
        abi: BONDING_CURVE_ABI,
        functionName: 'buy',
        args: [token, minTokensOut],
        value: dogeAmountWei,
        account: userAddress,
      });
      const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });
      return { success: true, txHash, receipt };
    } catch (error) {
      console.error('❌ Error buying token:', error);
      return { success: false, error: error.shortMessage || error.message || 'Buy failed' };
    }
  }

  // Approve is a separate signed tx, required once per token before the
  // first sell (or again if a later sell exceeds the remaining allowance).
  async approveToken(walletClient, userAddress, token, amountWei) {
    try {
      const txHash = await walletClient.writeContract({
        address: token,
        abi: LAUNCH_TOKEN_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.BONDING_CURVE, amountWei],
        account: userAddress,
      });
      await this.client.waitForTransactionReceipt({ hash: txHash });
      return { success: true, txHash };
    } catch (error) {
      console.error('❌ Error approving token:', error);
      return { success: false, error: error.shortMessage || error.message || 'Approval failed' };
    }
  }

  async sellToken(walletClient, userAddress, token, tokenAmountWei, minDogeOut) {
    try {
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.BONDING_CURVE,
        abi: BONDING_CURVE_ABI,
        functionName: 'sell',
        args: [token, tokenAmountWei, minDogeOut],
        account: userAddress,
      });
      const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });
      return { success: true, txHash, receipt };
    } catch (error) {
      console.error('❌ Error selling token:', error);
      return { success: false, error: error.shortMessage || error.message || 'Sell failed' };
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
