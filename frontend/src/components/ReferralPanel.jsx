import React, { useState } from 'react';
import { useReferral } from '../hooks/useReferral';

export default function ReferralPanel({ playerAddress }) {
  const { referralData, loading, error } = useReferral(playerAddress);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!referralData?.referral_link) return;
    navigator.clipboard.writeText(referralData.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (!referralData) return null;

  const progressPercent = Math.min(
    100,
    (referralData.referral_count / referralData.max_referrals) * 100
  );

  return (
    <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-yellow-400">🐾 Referral Program</h2>
        <p className="text-gray-400 text-sm mt-1">
          Invite friends and earn <span className="text-yellow-300 font-semibold">500 points</span> per referral.
          They get <span className="text-green-400 font-semibold">250 bonus points</span> too!
        </p>
      </div>

      {/* Referral Link */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralData.referral_link}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Code: <span className="text-yellow-400 font-mono">{referralData.referral_code}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{referralData.referral_count}</div>
          <div className="text-xs text-gray-400 mt-1">Referrals</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {referralData.referral_count * 500}
          </div>
          <div className="text-xs text-gray-400 mt-1">Points Earned</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{referralData.remaining_slots}</div>
          <div className="text-xs text-gray-400 mt-1">Slots Left</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{referralData.referral_count} / {referralData.max_referrals} referrals used</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(referralData.referral_link)}&text=${encodeURIComponent('🐕 Join me on DogeFood Lab! Use my link to get 250 bonus points!')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Share on Telegram
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🐕 Join me on DogeFood Lab and get 250 bonus points! ${referralData.referral_link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Share on X
        </a>
      </div>
    </div>
  );
}
