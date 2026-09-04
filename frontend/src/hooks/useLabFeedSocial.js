import { usePublicClient, useReadContracts } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { useUniversalWalletClient } from './useUniversalWalletClient';

// Deployed on DogeOS Chikyu Testnet — contracts/deployments/dogeosTestnet/LabFeedSocial.json.
// Update this if the contract is ever redeployed.
export const LABFEED_SOCIAL_ADDRESS = '0xEA0524516A1220E913E2100E9F550B709e3A1f82';

// Minimal ABI - just the functions this app actually calls, taken directly
// from the compiled contract (contracts/contracts/LabFeedSocial.sol).
export const LABFEED_SOCIAL_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'postId', type: 'bytes32' },
      { internalType: 'address', name: 'author', type: 'address' },
      { internalType: 'bytes', name: 'registrationSig', type: 'bytes' },
    ],
    name: 'likePost',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'postId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'commentId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'commentHash', type: 'bytes32' },
      { internalType: 'address', name: 'author', type: 'address' },
      { internalType: 'bytes', name: 'registrationSig', type: 'bytes' },
    ],
    name: 'commentPost',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  { inputs: [], name: 'likePrice', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'commentPrice', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
];

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

async function fetchAuth(noteId) {
  const res = await fetch(`${API_URL}/api/lab-feed-social/${noteId}/auth`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Could not prepare on-chain interaction');
  return data;
}

// crypto.randomUUID() isn't available in every WebView this app runs in
// (Telegram / in-app wallet browsers) - getRandomValues() is much older
// and more broadly supported, and is all a comment ID needs (just a random,
// effectively-unique bytes32; the actual comment text lives in comment_hash).
function randomBytes32() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns null for "the person cancelled the wallet prompt" (not a real
// error, don't alarm anyone about it) or a readable message otherwise.
export function onChainErrorMessage(e) {
  const msg = e?.shortMessage || e?.message || '';
  if (msg.includes('User rejected') || msg.includes('User denied') || e?.code === 4001) return null;
  return msg || 'Transaction failed';
}

/**
 * Wallet-signed on-chain Like/Comment interactions for LabFeedSocial.
 * Fetches a registration signature from the backend, submits the
 * transaction, tells the backend the tx_hash so it can reconcile once
 * confirmed (see lab_feed_social_indexer.py), then waits for the receipt.
 * Throws on cancellation or on-chain failure - callers own reverting their
 * own optimistic UI state on catch (see LabFeed.jsx's handleLikeOnChain /
 * handleCommentOnChain).
 */
export function useLabFeedSocial(effectiveAddress) {
  const publicClient = usePublicClient();
  const { walletClient } = useUniversalWalletClient();

  const { data: priceData } = useReadContracts({
    contracts: [
      { address: LABFEED_SOCIAL_ADDRESS, abi: LABFEED_SOCIAL_ABI, functionName: 'likePrice' },
      { address: LABFEED_SOCIAL_ADDRESS, abi: LABFEED_SOCIAL_ABI, functionName: 'commentPrice' },
    ],
  });
  const likePrice = priceData?.[0]?.result;
  const commentPrice = priceData?.[1]?.result;

  const likeOnChain = async (note) => {
    if (likePrice === undefined) throw new Error('Still loading — try again in a moment.');
    if (!walletClient) throw new Error('Wallet not connected. Please reconnect and try again.');
    const auth = await fetchAuth(note.id);
    const txHash = await walletClient.writeContract({
      address: auth.contract_address,
      abi: LABFEED_SOCIAL_ABI,
      functionName: 'likePost',
      args: [auth.post_id, auth.author, auth.registration_signature],
      value: likePrice,
    });
    fetch(`${API_URL}/api/lab-feed-social/${note.id}/like-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_address: effectiveAddress, tx_hash: txHash }),
    }).catch(() => {});
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') throw new Error('Like transaction failed on-chain.');
    return txHash;
  };

  const commentOnChain = async (note, content) => {
    if (commentPrice === undefined) throw new Error('Still loading — try again in a moment.');
    if (!walletClient) throw new Error('Wallet not connected. Please reconnect and try again.');
    const trimmed = content.trim();
    const commentId = randomBytes32();
    const commentHash = keccak256(toBytes(trimmed));
    const auth = await fetchAuth(note.id);
    const txHash = await walletClient.writeContract({
      address: auth.contract_address,
      abi: LABFEED_SOCIAL_ABI,
      functionName: 'commentPost',
      args: [auth.post_id, commentId, commentHash, auth.author, auth.registration_signature],
      value: commentPrice,
    });
    fetch(`${API_URL}/api/lab-feed-social/${note.id}/comment-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_address: effectiveAddress,
        comment_id: commentId,
        comment_hash: commentHash,
        content: trimmed,
        tx_hash: txHash,
      }),
    }).catch(() => {});
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') throw new Error('Comment transaction failed on-chain.');
    return { txHash, commentId };
  };

  return { likeOnChain, commentOnChain, likePrice, commentPrice };
}
