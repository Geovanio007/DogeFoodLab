// Smart Contract Addresses on DogeOS Chikyū Testnet
export const CONTRACT_ADDRESSES = {
  LAB_TOKEN: process.env.REACT_APP_LAB_TOKEN_ADDRESS || '0xc238Ef1C4d4d9109e4d8D0D6BB1eA55bA58861d1',
  DOGEFOOD_NFT: process.env.REACT_APP_DOGEFOOD_NFT_ADDRESS || '0xA74Dad05f54d32575f82C3e065C4441b8d979a54',
  REWARD_DISTRIBUTOR: process.env.REACT_APP_REWARD_DISTRIBUTOR_ADDRESS || '0x37F20600fd6eF1416ccb1DD20043CCfb4d72ba30',
  LAUNCHPAD_FACTORY: process.env.REACT_APP_LAUNCHPAD_FACTORY_ADDRESS || '0xFf3cebc023F43d4a4F66F02560872Ed4B0aDA241',
  BONDING_CURVE: process.env.REACT_APP_BONDING_CURVE_ADDRESS || '0x5C1E7deb7BD89d4AEB7B57B7b6D1Ad266886f848',
  GRADUATION_MANAGER: process.env.REACT_APP_GRADUATION_MANAGER_ADDRESS || '0x7c19D7533D6FFd6969352ff60Dd55387EcAF8DDE',
  LAUNCHER_TREASURY: process.env.REACT_APP_LAUNCHER_TREASURY_ADDRESS || '0x17083489ff064340d2971e3538F600FCB3211515',
  ROYALTY_DISTRIBUTOR: process.env.REACT_APP_ROYALTY_DISTRIBUTOR_ADDRESS || '0x4CfF95f1EDFC46646D4C2d345e1AF8Aa375ac8D6',
  GAME_PAYMENT_GATEWAY: process.env.REACT_APP_GAME_PAYMENT_GATEWAY_ADDRESS || '0x1277F70716AfadA4e62790210a08F690aA48B1Eb',
};

// Network Information
export const DOGEOS_DEVNET = {
  chainId: parseInt(process.env.REACT_APP_DOGEOS_CHAIN_ID) || 6281971,
  name: 'DogeOS Chikyū Testnet',
  rpcUrl: process.env.REACT_APP_DOGEOS_RPC_URL || 'https://rpc.testnet.dogeos.com',
  blockExplorer: process.env.REACT_APP_DOGEOS_EXPLORER || 'https://blockscout.testnet.dogeos.com/',
  symbol: 'DOGE',
};

// Contract ABIs (simplified for essential functions)
export const LAB_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export const DOGEFOOD_NFT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}],
    "name": "mintTreat",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "DogeNFTMinted",
    "type": "event"
  }
];

export const REWARD_DISTRIBUTOR_ABI = [
  {
    "inputs": [],
    "name": "currentSeason",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "seasonId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "hasClaimedSeason",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "seasonId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getClaimedAmount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export const LAUNCHPAD_FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "symbol", "type": "string"}
    ],
    "name": "createToken",
    "outputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "symbol", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "totalSupply", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}
    ],
    "name": "TokenLaunched",
    "type": "event"
  }
];

export const BONDING_CURVE_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "minTokensOut", "type": "uint256"}
    ],
    "name": "buy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "minDogeOut", "type": "uint256"}
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "dogeIn", "type": "uint256"}
    ],
    "name": "previewBuy",
    "outputs": [
      {"internalType": "uint256", "name": "tokensOut", "type": "uint256"},
      {"internalType": "uint256", "name": "fee", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "tokenIn", "type": "uint256"}
    ],
    "name": "previewSell",
    "outputs": [
      {"internalType": "uint256", "name": "dogeOut", "type": "uint256"},
      {"internalType": "uint256", "name": "fee", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "isGraduated",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export const LAUNCH_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Token Information
export const LAB_TOKEN_INFO = {
  name: 'LAB Token',
  symbol: 'LAB',
  decimals: 18,
  totalSupply: '420000000', // 420M tokens
  allocations: {
    community: '70%', // 294M LAB for rewards
    publicSale: '10%', // 42M LAB
    liquidity: '10%', // 42M LAB
    marketing: '5%', // 21M LAB
    team: '5%', // 21M LAB (vested)
  },
};

export const DOGEFOOD_NFT_INFO = {
  name: 'DogeFood Collection',
  symbol: 'DOGEFOOD',
  maxSupply: 420,
  description: 'Exclusive NFT collection for DogeFood Lab VIP Scientists',
};
