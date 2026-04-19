import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-nav transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-spectral/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-30 disabled:pointer-events-none rounded-ghost";
  
  const variants = {
    primary: "bg-[rgba(240,240,250,0.10)] text-spectral border border-[rgba(240,240,250,0.35)] hover:bg-[rgba(240,240,250,0.18)] hover:border-[rgba(240,240,250,0.5)]",
    secondary: "bg-[rgba(240,240,250,0.04)] text-spectral/60 border border-[rgba(240,240,250,0.12)] hover:bg-[rgba(240,240,250,0.08)] hover:text-spectral",
    danger: "bg-[rgba(240,240,250,0.06)] text-spectral/70 border border-[rgba(240,240,250,0.20)] hover:bg-[rgba(240,240,250,0.12)] hover:text-spectral",
    ghost: "bg-transparent text-spectral/40 border border-transparent hover:text-spectral/80 hover:bg-[rgba(240,240,250,0.04)]",
    outline: "bg-transparent text-spectral border border-[rgba(240,240,250,0.35)] hover:bg-[rgba(240,240,250,0.08)]",
  };

  const sizes = {
    sm: "h-8 px-4 text-[10px]",
    md: "h-10 px-5 text-xs",
    lg: "h-12 px-7 text-xs",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};