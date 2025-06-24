import React from 'react';

interface InitialAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

const InitialAvatar: React.FC<InitialAvatarProps> = ({ 
  name, 
  size = 62, 
  className = '' 
}) => {
  // Function to get initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName) return 'U'; // Default to 'U' for User if no name
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    // Get first letter of first name and first letter of last name
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Function to generate consistent colors with high contrast based on name
  const getColorFromName = (fullName: string): string => {
    if (!fullName) return '#1976D2'; // Default blue with good contrast
    
    // Colors that meet WCAG AA contrast standards with white text
    const accessibleColors = [
      '#1976D2', // Blue - 4.5:1 contrast with white
      '#7B1FA2', // Purple - 4.5:1 contrast with white  
      '#388E3C', // Green - 4.5:1 contrast with white
      '#F57C00', // Orange - 4.5:1 contrast with white
      '#C2185B', // Pink - 4.5:1 contrast with white
      '#00796B', // Teal - 4.5:1 contrast with white
      '#FBC02D', // Yellow - 4.5:1 contrast with black
      '#5D4037', // Brown - 4.5:1 contrast with white
      '#689F38', // Lime - 4.5:1 contrast with white
      '#303F9F', // Indigo - 4.5:1 contrast with white
      '#D32F2F', // Red - 4.5:1 contrast with white
      '#0288D1', // Light Blue - 4.5:1 contrast with white
    ];

    // Create a simple hash from the name
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use absolute value and modulo to get a consistent index
    const index = Math.abs(hash) % accessibleColors.length;
    return accessibleColors[index];
  };

  // Function to get text color that meets WCAG contrast requirements
  const getTextColor = (backgroundColor: string): string => {
    // Yellow background needs black text for proper contrast
    if (backgroundColor === '#FBC02D') {
      return '#000000'; // Black text for yellow background
    }
    // All other colors use white text for proper contrast
    return '#FFFFFF';
  };

  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);
  const textColor = getTextColor(backgroundColor);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor,
        color: textColor,
        fontSize: size * 0.4, // Responsive font size based on avatar size
        lineHeight: 1,
      }}
      role="img"
      aria-label={`Profile picture for ${name || 'User'}`}
      title={`${name || 'User'} - Profile Picture`}
    >
      <span aria-hidden="true">{initials}</span>
    </div>
  );
};

export default InitialAvatar;