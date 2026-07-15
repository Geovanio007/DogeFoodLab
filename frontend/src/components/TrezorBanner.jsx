import React from 'react';

const TREZOR_AFFILIATE_URL = 'https://affil.trezor.io/aff_c?offer_id=235&aff_id=846432&source=dogefood';

// Site-wide ad banner — rendered once in App.js, above the Kernel of Wow
// banner, so it appears on every route without needing to be added to
// each individual page component.
const TrezorBanner = () => {
  const handleClick = () => {
    window.open(TREZOR_AFFILIATE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="w-full block bg-transparent border-0 p-0 m-0 cursor-pointer"
      aria-label="Trezor — secure your crypto with a hardware wallet"
      data-testid="trezor-ad-banner"
    >
      <img src="/Trezorsafe5.png" alt="Trezor" className="w-full h-auto block" />
    </button>
  );
};

export default TrezorBanner;
