import type { FC } from 'react';
import Lottie from 'lottie-react';
import fireAnimationData from '../src/assets/animated-flame.json';

interface FireAnimationProps {
  className?: string;
  size?: number;
}

export const FireAnimation: FC<FireAnimationProps> = ({ className = '', size }) => {
  const style = size ? { width: size, height: size } : undefined;
  
  return (
    <div className={className} style={style}>
      <Lottie 
        animationData={fireAnimationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
    </div>
  );
};
