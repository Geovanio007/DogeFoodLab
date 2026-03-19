import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check } from 'lucide-react';

const CharacterSelection = ({ onCharacterSelected }) => {
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const characters = [
    {
      id: 'max',
      name: 'Shiba Scientist Max',
      description: 'The clever and curious one',
      personality: 'Methodical and analytical, Max loves to understand the science behind every reaction.',
      image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/5thty2tp_20250921_1510_Doge%20Scientist%20Trio_simple_compose_01k5p68s01e1p8f81hk4dvm5tm.png',
      traits: ['Analytical', 'Precise', 'Studious'],
      bonus: '+10% Experience from treats',
      traitEmoji: '🧠'
    },
    {
      id: 'rex',
      name: 'Shiba Scientist Rex',
      description: 'The mischievous genius',
      personality: 'Bold and experimental, Rex loves to try wild combinations and discover new possibilities.',
      image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/w3y5oh69_assets_task_01k5p6sq20fh68gb4hjbs9271e_1758460753_img_0.webp',
      traits: ['Creative', 'Risk-taker', 'Playful'],
      bonus: '+15% Rare treat chance',
      traitEmoji: '🔥'
    },
    {
      id: 'luna',
      name: 'Shiba Scientist Luna',
      description: 'The smart and fearless female scientist',
      personality: 'Confident and innovative, Luna excels at optimization and efficiency in the lab.',
      image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/m1k3hm3c_assets_task_01k5p7arcvf6jt34pk82yke1sh_1758461571_img_0.webp',
      traits: ['Fearless', 'Efficient', 'Innovative'],
      bonus: '+20% Points from treats',
      traitEmoji: '⚡'
    }
  ];

  const handleCharacterSelect = (character) => setSelectedCharacter(character);

  const handleConfirmSelection = () => {
    if (selectedCharacter) {
      localStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacter));
      onCharacterSelected(selectedCharacter);
    }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #1e3a8a 50%, #312e81 100%)' }}>
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#ffffff' }}>
            Choose Your Scientist!
          </h1>
          <p className="text-lg mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Select your character to begin your DogeFood Lab adventure
          </p>
          <p className="text-base font-semibold" style={{ color: '#facc15' }}>
            Each scientist has unique bonuses and personality!
          </p>
        </div>

        {/* Character Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {characters.map((character) => (
            <div
              key={character.id}
              onClick={() => handleCharacterSelect(character)}
              className="relative cursor-pointer transition-all duration-300 transform hover:scale-105 rounded-2xl overflow-hidden"
              style={{
                background: selectedCharacter?.id === character.id
                  ? 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
                  : '#ffffff',
                border: selectedCharacter?.id === character.id
                  ? '3px solid #facc15'
                  : '3px solid transparent',
                boxShadow: selectedCharacter?.id === character.id
                  ? '0 0 30px rgba(250, 204, 21, 0.4)'
                  : '0 10px 30px rgba(0,0,0,0.3)',
              }}
            >
              {/* Selected checkmark */}
              {selectedCharacter?.id === character.id && (
                <div className="absolute top-3 right-3 p-2 rounded-full" style={{ background: '#facc15' }}>
                  <Check className="w-5 h-5" style={{ color: '#92400e' }} />
                </div>
              )}

              <div className="p-6">
                {/* Character Image */}
                <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 shadow-lg" style={{ borderColor: '#93c5fd' }}>
                  <img
                    src={character.image}
                    alt={character.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/placeholder-scientist.png'; }}
                  />
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-center mb-1" style={{ color: '#1e293b' }}>
                  {character.name}
                </h3>

                {/* Description */}
                <p className="text-center font-semibold mb-3" style={{ color: '#2563eb' }}>
                  {character.description}
                </p>

                {/* Personality */}
                <p className="text-center text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
                  {character.personality}
                </p>

                {/* Traits */}
                <div className="mb-4">
                  <h4 className="font-bold text-center mb-2" style={{ color: '#1e293b' }}>Traits:</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {character.traits.map((trait, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ background: '#dbeafe', color: '#1e40af' }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bonus */}
                <div className="p-3 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #dcfce7, #d1fae5)', border: '2px solid #86efac' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#166534' }}>Special Bonus:</p>
                  <p className="font-bold" style={{ color: '#15803d' }}>
                    {character.bonus}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="text-center">
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedCharacter}
            className="text-xl font-bold py-4 px-10 rounded-xl shadow-2xl transition-all duration-300"
            style={{
              background: selectedCharacter
                ? 'linear-gradient(135deg, #facc15 0%, #f97316 100%)'
                : '#9ca3af',
              color: selectedCharacter ? '#ffffff' : '#6b7280',
              cursor: selectedCharacter ? 'pointer' : 'not-allowed',
              transform: selectedCharacter ? 'scale(1)' : 'scale(1)',
              border: 'none',
            }}
          >
            {selectedCharacter
              ? `Start Adventure with ${selectedCharacter.name.split(' ')[2]}!`
              : 'Please select a character'}
          </button>

          {selectedCharacter && (
            <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Ready to begin your scientific journey? Let's go!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
