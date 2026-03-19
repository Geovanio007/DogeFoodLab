import { useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function useReferralOnJoin(playerAddress, isNewPlayer) {
  const applied = useRef(false);

  useEffect(() => {
    if (!playerAddress || !isNewPlayer || applied.current) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (!refCode) return;

    applied.current = true;

    const applyCode = async () => {
      try {
        await axios.post(`${API}/referral/apply`, {
          new_player_address: playerAddress,
          referral_code: refCode
        });
        console.log('✅ Referral code applied:', refCode);

        // Clean the ?ref= param from the URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        // Silently fail - code may already be used or invalid
        console.log('Referral apply skipped:', err.response?.data?.detail);
      }
    };

    applyCode();
  }, [playerAddress, isNewPlayer]);
}
