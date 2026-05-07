import cardsSheet from '../assets/Cards.png';

interface CardProps {
  index?: number;
  type?: 'deck' | 'face-up' | 'hand';
  isback?: boolean;
  highlighted?: boolean;
  onClick?: () => void; // на будущее
}

export function Card({ index = 0, highlighted, isback, onClick}: CardProps) {
  const cardIndex = isback ? 69 : index;
  const col = cardIndex % 10;
  const row = Math.floor(cardIndex / 10);

  const posX = (col / (10 - 1)) * 100;
  const posY = (row / (7 - 1)) * 100;
  return (
    <div className="relative group" onClick={onClick}>
      <div 
        className={`
          relative rounded-lg shadow-md border border-gray-300
          w-20 h-28 overflow-hidden transition-all duration-300
          ${highlighted ? 'ring-2 ring-blue-400 scale-105' : 'hover:scale-105'}
          ${onClick ? 'cursor-pointer' : ''}
        `}
        style={{
          backgroundImage: `url(${cardsSheet})`,
          backgroundSize: '1000% 700%',
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: 'no-repeat'
        }}
      />
    </div>
  );
}