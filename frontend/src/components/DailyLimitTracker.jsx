import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { X, Clock, Zap, Loader2, Heart, Package, Coins } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Streak tier info
const STREAK_TIERS = {
  1: { icon: '🌱', title: 'New Chef', color: 'text-gray-300' },
  3: { icon: '⭐', title: 'Rising Star', color: 'text-green-400' },
  5: { icon: '🔥', title: 'Dedicated Chef', color: 'text-orange-400' },
  7: { icon: '💪', title: 'Week Warrior', color: 'text-blue-400' },
  14: { icon: '🏆', title: 'Lab Legend', color: 'text-purple-400' },
  30: { icon: '👑', title: 'Master Scientist', color: 'text-yellow-400' },
};

const getStreakTier = (streak) => {
  let tier = STREAK_TIERS[1];
  for (const [threshold, tierInfo] of Object.entries(STREAK_TIERS)) {
    if (streak >= parseInt(threshold)) {
      tier = tierInfo;
    }
  }
  return tier;
};

const DailyLimitTracker = ({ playerAddress, onStatusUpdate, openModalTrigger }) => {
  const [dailyStatus, setDailyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtraLifeModal, setShowExtraLifeModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  
  // Extra Life purchase state
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [creatingNowPayments, setCreatingNowPayments] = useState(null); // holds the package id currently being created, or null

  // Lets a parent (e.g. the Lab page's mix button, which turns into a
  // "Need Extra Life?" prompt once the player is out of lives) force this
  // modal open from outside. Any change to openModalTrigger's value opens
  // it -- the parent just needs to bump a counter/timestamp each time.
  useEffect(() => {
    if (openModalTrigger) {
      setShowExtraLifeModal(true);
    }
  }, [openModalTrigger]);

  // Fetch daily status
  const fetchDailyStatus = useCallback(async () => {
    if (!playerAddress) return;
    
    try {
      const statusRes = await fetch(`${API_URL}/api/daily-status/${playerAddress}`);
      
      if (statusRes.ok) {
        const data = await statusRes.json();
        setDailyStatus(data);
        setTimeUntilReset(data.time_until_reset_seconds || 0);
        if (onStatusUpdate) {
          onStatusUpdate(data);
        }
      }
    } catch (err) {
      console.error('Error fetching daily status:', err);
    } finally {
      setLoading(false);
    }
  }, [playerAddress, onStatusUpdate]);

  useEffect(() => {
    fetchDailyStatus();
  }, [fetchDailyStatus]);

  // Countdown timer — update every 60s (minute precision is enough for 6h window)
  useEffect(() => {
    if (timeUntilReset <= 0) return;
    
    const timer = setInterval(() => {
      setTimeUntilReset(prev => {
        if (prev <= 60) {
          fetchDailyStatus();
          return 0;
        }
        return prev - 60;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [timeUntilReset, fetchDailyStatus]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Pays via a NOWPayments hosted invoice. Sends the player to NOWPayments'
  // own checkout page, where they can pay with DOGE or any other supported
  // coin; NOWPayments notifies the backend directly once it settles, so
  // there's nothing to paste or confirm here.
  const handleSelectPackageNowPayments = async (pkg) => {
    setCreatingNowPayments(pkg.id);
    setPurchaseResult(null);

    try {
      const response = await fetch(`${API_URL}/api/nowpayments/extra-life/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_address: playerAddress,
          package_id: pkg.id
        })
      });

      const data = await response.json();

      if (response.ok && data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        setPurchaseResult({ success: false, message: data.detail || 'Failed to create NOWPayments invoice' });
      }
    } catch (err) {
      setPurchaseResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setCreatingNowPayments(null);
    }
  };

  const closeModal = () => {
    setShowExtraLifeModal(false);
    setPurchaseResult(null);
  };

  if (loading) {
    return <div className="animate-pulse bg-white/10 rounded-xl p-4 h-24"></div>;
  }

  if (!dailyStatus) return null;

  const treatsInWindow = dailyStatus.treats_in_window || 0;
  const windowLimit = dailyStatus.window_limit || 4;
  const treatsToday = dailyStatus.treats_today || 0;
  const dailyLimit = dailyStatus.daily_limit || 16;
  const remaining = dailyStatus.remaining_treats || 0;
  const windowHours = dailyStatus.window_hours || 6;
  const windowProgress = (treatsInWindow / windowLimit) * 100;
  const isLimitReached = remaining === 0;
  const extraTreatsBalance = dailyStatus.extra_treats_balance || 0;
  const packages = dailyStatus.extra_life_packages || [];
  
  const streak = dailyStatus.streak?.current_streak || 0;
  const streakBonus = dailyStatus.streak_bonus || {};
  const streakTier = getStreakTier(streak);

  return (
    <>
      {/* Limit Tracker Card */}
      <Card className={`${isLimitReached ? 'bg-gradient-to-br from-red-600/90 to-red-700/90 border-red-400/50' : 'bg-gradient-to-br from-sky-600/90 to-blue-700/90 border-sky-400/50'} backdrop-blur-xl shadow-xl`}>
        <CardContent className="p-3 sm:p-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{isLimitReached ? '🚫' : '🧪'}</span>
              <div>
                <h3 className="text-white font-bold text-sm">Treats</h3>
                <p className="text-sky-200 text-xs">
                  {remaining} left • {treatsToday}/{dailyLimit} today
                  {extraTreatsBalance > 0 && (
                    <span className="text-green-300 ml-1">(+{extraTreatsBalance} bonus)</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Streak Badge */}
            <button 
              onClick={() => setShowStreakModal(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500/80 to-red-500/80 hover:from-orange-400 hover:to-red-400 px-2 py-1 rounded-full transition-all hover:scale-105"
              data-testid="streak-badge"
            >
              <span className="text-base">{streakTier.icon}</span>
              <span className="text-white font-bold text-xs">{streak}d</span>
            </button>
          </div>
          
          {/* Window Progress */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-sky-200 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {windowHours}h Window
              </span>
              <span>{treatsInWindow}/{windowLimit}</span>
            </div>
            <Progress value={windowProgress} className={`h-2 ${isLimitReached ? '[&>div]:bg-red-400' : ''}`} />
          </div>
          
          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-sky-200">
              {timeUntilReset > 0 ? (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  Resets in {formatTime(timeUntilReset)}
                </span>
              ) : streakBonus.bonus_treats > 0 ? (
                <span className="text-green-300">+{streakBonus.bonus_treats} streak bonus</span>
              ) : (
                <span className={streakTier.color}>{streakTier.title}</span>
              )}
            </div>
            
            <Button
              onClick={() => setShowExtraLifeModal(true)}
              size="sm"
              className={`${isLimitReached 
                ? 'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-300 hover:to-red-400 animate-pulse' 
                : 'bg-white/20 hover:bg-white/30'
              } text-white text-xs h-7 px-2`}
              data-testid="buy-extra-life-btn"
            >
              <Heart className="w-3 h-3 mr-1" /> {isLimitReached ? 'Need More?' : 'Extra Life'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streak Modal */}
      {showStreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs relative">
            <button
              onClick={() => setShowStreakModal(false)}
              className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-400 rounded-full p-1 shadow-lg"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            <Card className="bg-gradient-to-b from-emerald-700 via-emerald-800 to-green-900 border-emerald-500/50 shadow-2xl">
              <CardContent className="p-3">
                <div className="text-center mb-2">
                  <div className="text-4xl mb-0.5">{streakTier.icon}</div>
                  <h2 className="text-xl font-bold text-white">{streak} Day Streak!</h2>
                  <p className={`text-xs font-semibold ${streakTier.color}`}>{streakTier.title}</p>
                </div>

                <div className="bg-black/20 rounded-lg p-2 mb-2">
                  <h3 className="text-white font-bold mb-1.5 text-center text-[10px]">Your Bonuses</h3>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-emerald-600/30 rounded p-1.5">
                      <div className="text-white font-bold text-sm">+{streakBonus.bonus_treats || 0}</div>
                      <div className="text-emerald-300 text-[9px]">Treats</div>
                    </div>
                    <div className="bg-emerald-600/30 rounded p-1.5">
                      <div className="text-white font-bold text-sm">{((streakBonus.xp_multiplier || 1) * 100).toFixed(0)}%</div>
                      <div className="text-emerald-300 text-[9px]">XP</div>
                    </div>
                    <div className="bg-emerald-600/30 rounded p-1.5">
                      <div className="text-white font-bold text-sm">-{streakBonus.brewing_reduction || 0}%</div>
                      <div className="text-emerald-300 text-[9px]">Brew</div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setShowStreakModal(false)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs h-8">
                  Keep Cooking!
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Extra Life Modal - Auto Payment Detection */}
      {showExtraLifeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-sm relative my-4">
            <button
              onClick={closeModal}
              className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-400 rounded-full p-1 shadow-lg"
              data-testid="close-extra-life-modal"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            <Card className="bg-gradient-to-b from-rose-600 via-rose-700 to-red-800 border-rose-400 shadow-2xl transition-all duration-500">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-1">
                    <Heart className="w-12 h-12 mx-auto text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Extra Life Packs</h2>
                  <p className="text-rose-200 text-sm">Get more treats with DOGE or any crypto</p>
                  {extraTreatsBalance > 0 && (
                    <Badge className="mt-2 bg-green-500/30 text-green-200">
                      Current Balance: {extraTreatsBalance} bonus treats
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleSelectPackageNowPayments(pkg)}
                      disabled={creatingNowPayments === pkg.id}
                      className={`w-full p-3 rounded-lg border-2 transition-all border-rose-400/30 bg-black/20 hover:border-rose-400/60 hover:bg-black/30 ${
                        creatingNowPayments === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      data-testid={`extra-life-package-${pkg.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            pkg.id === 'premium' ? 'bg-yellow-500/30' : 
                            pkg.id === 'standard' ? 'bg-blue-500/30' : 'bg-gray-500/30'
                          }`}>
                            <Package className={`w-5 h-5 ${
                              pkg.id === 'premium' ? 'text-yellow-400' : 
                              pkg.id === 'standard' ? 'text-blue-400' : 'text-gray-300'
                            }`} />
                          </div>
                          <div className="text-left">
                            <h4 className="text-white font-bold text-sm">{pkg.name}</h4>
                            <p className="text-rose-200 text-xs">+{pkg.treats} treats</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {creatingNowPayments === pkg.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-yellow-400 ml-auto" />
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-yellow-400 font-bold">
                                <Coins className="w-4 h-4" />
                                <span>{pkg.cost_doge}</span>
                              </div>
                              <span className="text-rose-300 text-xs">DOGE (or any crypto)</span>
                            </>
                          )}
                        </div>
                      </div>
                      {pkg.id === 'premium' && (
                        <Badge className="mt-2 bg-yellow-500/30 text-yellow-200 text-xs">
                          Best Value!
                        </Badge>
                      )}
                    </button>
                  ))}

                  <p className="text-center text-rose-300/70 text-xs">
                    Checkout is hosted by NOWPayments — pay with DOGE, BTC, ETH, USDT, and more.
                  </p>

                  {/* Result Message */}
                  {purchaseResult && (
                    <div className={`rounded-lg p-2 text-sm ${purchaseResult.success ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>
                      <p>{purchaseResult.message}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default DailyLimitTracker;
