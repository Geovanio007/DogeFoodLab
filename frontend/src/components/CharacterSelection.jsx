import React, { useState } from 'react';
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
    },
    {
      id: 'rex',
      name: 'Shiba Scientist Rex',
      description: 'The mischievous genius',
      personality: 'Bold and experimental, Rex loves to try wild combinations and discover new possibilities.',
      image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/w3y5oh69_assets_task_01k5p6sq20fh68gb4hjbs9271e_1758460753_img_0.webp',
      traits: ['Creative', 'Risk-taker', 'Playful'],
      bonus: '+15% Rare treat chance',
    },
    {
      id: 'luna',
      name: 'Shiba Scientist Luna',
      description: 'The smart and fearless female scientist',
      personality: 'Confident and innovative, Luna excels at optimization and efficiency in the lab.',
      image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/m1k3hm3c_assets_task_01k5p7arcvf6jt34pk82yke1sh_1758461571_img_0.webp',
      traits: ['Fearless', 'Efficient', 'Innovative'],
      bonus: '+20% Points from treats',
    }
  ];

  const handleConfirmSelection = () => {
    if (selectedCharacter) {
      localStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacter));
      onCharacterSelected(selectedCharacter);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%)',
      padding: '24px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', marginBottom: '10px' }}>
            🧪 Choose Your Scientist! 🧪
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', marginBottom: '6px' }}>
            Select your character to begin your DogeFood Lab adventure
          </p>
          <p style={{ color: '#facc15', fontWeight: '600', fontSize: '0.9rem' }}>
            ⚠️ This choice is permanent!
          </p>
        </div>

        {/* Character Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {characters.map((character) => {
            const isSelected = selectedCharacter?.id === character.id;
            return (
              <div
                key={character.id}
                onClick={() => setSelectedCharacter(character)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: isSelected
                    ? 'linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%)'
                    : '#151b28',
                  border: isSelected
                    ? '2px solid #facc15'
                    : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? '0 0 30px rgba(250,204,21,0.25)'
                    : '0 8px 24px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: '#facc15', borderRadius: '50%',
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10,
                  }}>
                    <Check size={16} color="#1a1a00" />
                  </div>
                )}

                <div style={{ padding: '24px' }}>
                  {/* Character Image */}
                  <div style={{
                    width: '110px', height: '110px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid',
                    borderColor: isSelected ? '#facc15' : 'rgba(147,197,253,0.4)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                    <img
                      src={character.image}
                      alt={character.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = '/placeholder-scientist.png'; }}
                    />
                  </div>

                  {/* Name */}
                  <h3 style={{
                    fontSize: '1.1rem', fontWeight: '700',
                    color: '#ffffff',
                    textAlign: 'center', marginBottom: '6px',
                  }}>
                    {character.name}
                  </h3>

                  {/* Description */}
                  <p style={{
                    textAlign: 'center', fontWeight: '600',
                    color: isSelected ? '#93c5fd' : '#60a5fa',
                    marginBottom: '12px', fontSize: '0.875rem',
                  }}>
                    {character.description}
                  </p>

                  {/* Personality */}
                  <p style={{
                    textAlign: 'center', fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: '1.5', marginBottom: '16px',
                  }}>
                    {character.personality}
                  </p>

                  {/* Traits */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{
                      textAlign: 'center', fontWeight: '600',
                      color: '#ffffff', marginBottom: '8px', fontSize: '0.8rem',
                    }}>
                      Traits:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
                      {character.traits.map((trait, index) => (
                        <span key={index} style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: '500',
                          background: 'rgba(96,165,250,0.15)',
                          color: '#93c5fd',
                          border: '1px solid rgba(96,165,250,0.3)',
                        }}>
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bonus */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.3)',
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6ee7b7', marginBottom: '4px' }}>
                      Special Bonus:
                    </p>
                    <p style={{ fontWeight: '700', color: '#34d399', fontSize: '0.875rem' }}>
                      {character.bonus}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedCharacter}
            style={{
              fontSize: '1.1rem', fontWeight: '700',
              padding: '14px 40px',
              borderRadius: '14px',
              border: 'none',
              cursor: selectedCharacter ? 'pointer' : 'not-allowed',
              background: selectedCharacter
                ? 'linear-gradient(135deg, #facc15 0%, #f97316 100%)'
                : 'rgba(255,255,255,0.1)',
              color: selectedCharacter ? '#1a1a00' : 'rgba(255,255,255,0.3)',
              boxShadow: selectedCharacter ? '0 8px 24px rgba(250,204,21,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {selectedCharacter
              ? `Start Adventure with ${selectedCharacter.name.split(' ')[2]}!`
              : 'Please select a character'}
          </button>

          {selectedCharacter && (
            <p style={{ marginTop: '14px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              Ready to begin your scientific journey? Let's go!
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default CharacterSelection;
