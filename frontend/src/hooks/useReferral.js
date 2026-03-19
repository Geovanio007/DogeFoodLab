import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function useReferral(playerAddress) {
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);

  const fetchReferralCode = useCallback(async () => {
    if (!playerAddress) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/referral/code/${playerAddress}`);
      setReferralData(res.data);
    } catch (err) {
      setError('Failed to load referral info');
    } finally {
      setLoading(false);
    }
  }, [playerAddress]);

  useEffect(() => {
    fetchReferralCode();
  }, [fetchReferralCode]);

  const applyReferralCode = useCallback(async (referralCode) => {
    if (!playerAddress || !referralCode) return;
    setApplyLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/referral/apply`, {
        new_player_address: playerAddress,
        referral_code: referralCode
      });
      setApplySuccess(res.data.message);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to apply referral code';
      setError(msg);
      return null;
    } finally {
      setApplyLoading(false);
    }
  }, [playerAddress]);

  return {
    referralData,
    loading,
    applyLoading,
    error,
    applySuccess,
    fetchReferralCode,
    applyReferralCode
  };
}
