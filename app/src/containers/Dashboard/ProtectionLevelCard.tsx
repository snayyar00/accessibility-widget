import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { baseColors } from '@/config/colors';
import { Shield, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { useMutation } from '@apollo/client';
import updateProtectionLevelMutation from '@/queries/sites/updateProtectionLevel';
import { getAuthenticationCookie } from '@/utils/cookie';

interface ProtectionLevelCardProps {
  protectionLevel: string | null | undefined;
  siteId?: number;
  siteUrl?: string;
  onProtectionLevelUpdated?: () => void;
}

type ProtectionLevel = 'No protection' | 'Automation' | 'Managed' | 'Managed + Assurance';

const ProtectionLevelCard: React.FC<ProtectionLevelCardProps> = ({
  protectionLevel,
  siteId,
  siteUrl,
  onProtectionLevelUpdated,
}) => {
  const history = useHistory();
  const [updateProtectionLevel] = useMutation(updateProtectionLevelMutation);
  const [isChecking, setIsChecking] = useState(false);
  const [localProtectionLevel, setLocalProtectionLevel] = useState<string | null | undefined>(protectionLevel);
  const hasAutoCheckedRef = useRef<string>(''); // Track which site we've auto-checked

  // Reset checking state when site changes
  useEffect(() => {
    setIsChecking(false);
    hasAutoCheckedRef.current = ''; // Reset auto-check tracking when site changes
  }, [siteId]);

  // Format the protection level value for display
  const formatProtectionLevel = (level: string | null | undefined): ProtectionLevel => {
    if (!level) return 'No protection';
    
    // Handle the 4 possible values
    switch (level.toLowerCase()) {
      case 'no protection':
        return 'No protection';
      case 'automation':
        return 'Automation';
      case 'managed':
        return 'Managed';
      case 'managed + assurance':
      case 'managed +assurance':
      case 'managed+assurance':
        return 'Managed + Assurance';
      default:
        return 'No protection';
    }
  };

  const protectionLevels: ProtectionLevel[] = [
    'No protection',
    'Automation',
    'Managed',
    'Managed + Assurance',
  ];

  // Update local state when prop changes (e.g., when site changes)
  useEffect(() => {
    setLocalProtectionLevel(protectionLevel);
  }, [protectionLevel, siteId]); // Also depend on siteId to reset when site changes

  const currentLevel = formatProtectionLevel(localProtectionLevel);

  const protectionLevelData = {
    'No protection': { percentage: 0, icon: ShieldAlert, color: '#EF4444' },
    'Automation': { percentage: 75, icon: Shield, color: baseColors.blueInfo },
    'Managed': { percentage: 90, icon: ShieldCheck, color: '#0d9488' },
    'Managed + Assurance': { percentage: 100, icon: ShieldCheck, color: '#22c55e' },
  };

  // Handle Check button click for Automation level
  const handleCheckScript = useCallback(async () => {
    if (!siteId || !siteUrl || isChecking) return;

    setIsChecking(true);
    try {
      const token = getAuthenticationCookie();
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/check-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ siteUrl }),
      });

      if (response.ok) {
        const result = await response.json();
        // Handle both string responses and possible JSON wrapped responses
        const checkResult = typeof result === 'string' ? result : (result.result || result.data || result);
        
        // Only update protection level for "No protection" -> "Automation" or "Automation" -> "No protection"
        // Don't change "Managed" or "Managed + Assurance" levels as they are higher tiers
        const currentLevelCheck = formatProtectionLevel(localProtectionLevel);
        
        if ((checkResult === 'true' || checkResult === 'Web Ability' || checkResult === 'WebAbility') && currentLevelCheck === 'No protection') {
          // Widget found and current level is No protection - update to Automation
          setLocalProtectionLevel('Automation');
          
          try {
            await updateProtectionLevel({
              variables: { siteId, protectionLevel: 'Automation' },
            });
            
            // Notify parent to refetch data
            if (onProtectionLevelUpdated) {
              onProtectionLevelUpdated();
            }
          } catch (updateError) {
            // Revert on error
            setLocalProtectionLevel(protectionLevel);
            console.error('Failed to update protection level:', updateError);
          }
        } else if (checkResult === 'false' && currentLevelCheck === 'Automation') {
          // Widget not found and current level is Automation - revert to No protection
          setLocalProtectionLevel('No protection');
          
          try {
            await updateProtectionLevel({
              variables: { siteId, protectionLevel: 'No protection' },
            });
            
            // Notify parent to refetch data
            if (onProtectionLevelUpdated) {
              onProtectionLevelUpdated();
            }
          } catch (updateError) {
            // Revert on error
            setLocalProtectionLevel(protectionLevel);
            console.error('Failed to update protection level:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking script:', error);
    } finally {
      setIsChecking(false);
    }
  }, [siteId, siteUrl, isChecking, localProtectionLevel, protectionLevel, updateProtectionLevel, onProtectionLevelUpdated]);

  // Auto-check protection level when dashboard loads and protection level is "No protection"
  useEffect(() => {
    const siteKey = `${siteId}-${siteUrl}`;
    
    // Only auto-check if:
    // 1. We have siteId and siteUrl
    // 2. Current level is "No protection"
    // 3. We haven't already auto-checked this site
    // 4. We're not currently checking
    if (
      siteId &&
      siteUrl &&
      currentLevel === 'No protection' &&
      hasAutoCheckedRef.current !== siteKey &&
      !isChecking
    ) {
      // Mark that we've auto-checked this site
      hasAutoCheckedRef.current = siteKey;
      
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        console.log(`Auto-checking protection level for ${siteUrl} (No protection detected)`);
        handleCheckScript();
      }, 500); // 500ms delay to ensure UI is ready

      return () => {
        clearTimeout(timer);
      };
    }
    
    // Return undefined cleanup function if condition is not met
    return undefined;
  }, [siteId, siteUrl, currentLevel, isChecking, handleCheckScript]); // Dependencies for auto-check

  const isNoProtection = currentLevel === 'No protection';
  const isAutomation = currentLevel === 'Automation';
  const isManaged = currentLevel === 'Managed';
  const isManagedAssurance = currentLevel === 'Managed + Assurance';
  const shouldShowCheckButton = !isManaged && !isManagedAssurance;

  return (
    <div
      className="rounded-xl w-full overflow-hidden"
      style={{
        backgroundColor: baseColors.white,
        border: 'none',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        maxWidth: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
        transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
      }}
    >
      {/* Warning Banner - Only show for "No protection" */}
      {isNoProtection && (
        <div
          className="rounded-lg mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 p-3 sm:p-4"
          style={{
            backgroundColor: '#FEF3F2',
            border: '1px solid #EF4444',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Info 
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
              style={{ color: '#EF4444' }} 
            />
            <p 
              className="text-xs sm:text-sm md:text-base font-medium break-words" 
              style={{ color: '#991B1B' }}
            >
              You are not protected. Your site is at risk of accessibility lawsuits.
            </p>
          </div>
          <button
            className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm md:text-base text-white flex-shrink-0 transition-all duration-200 hover:opacity-90 whitespace-nowrap w-full md:w-auto"
            style={{
              backgroundColor: '#EF4444',
            }}
            onClick={() => {
              history.push('/installation');
            }}
          >
            Install WebAbility
          </button>
        </div>
      )}

      {/* Info Banner - Show for "Automation" */}
      {isAutomation && (
        <div
          className="rounded-lg mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 p-3 sm:p-4"
          style={{
            backgroundColor: baseColors.infoBackground,
            border: `1px solid ${baseColors.blueInfo}`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Shield 
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
              style={{ color: baseColors.blueInfo }} 
            />
            <p 
              className="text-xs sm:text-sm md:text-base font-medium break-words" 
              style={{ color: baseColors.grayText }}
            >
              WebAbility widget is applied and automated fixes are being applied.
            </p>
          </div>
          <button
            className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm md:text-base text-white flex-shrink-0 transition-all duration-200 hover:opacity-90 whitespace-nowrap w-full md:w-auto"
            style={{
              backgroundColor: baseColors.blueInfo,
            }}
            onClick={() => {
              window.open('https://meetings.hubspot.com/webability', '_blank', 'noopener,noreferrer');
            }}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Info Banner - Show for "Managed" */}
      {currentLevel === 'Managed' && (
        <div
          className="rounded-lg mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 p-3 sm:p-4"
          style={{
            backgroundColor: '#CCFBF1',
            border: '1px solid #0d9488',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <ShieldCheck 
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
              style={{ color: '#0d9488' }} 
            />
            <p 
              className="text-xs sm:text-sm md:text-base font-medium break-words" 
              style={{ color: '#134e4a' }}
            >
              You're protected with managed accessibility services, automated fixes, and ongoing monitoring.
            </p>
          </div>
          <button
            className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm md:text-base text-white flex-shrink-0 transition-all duration-200 hover:opacity-90 whitespace-nowrap w-full md:w-auto"
            style={{
              backgroundColor: '#0d9488',
            }}
            onClick={() => {
              window.open('https://meetings.hubspot.com/webability', '_blank', 'noopener,noreferrer');
            }}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3 md:gap-4 mb-2">
          <h2 
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold md:flex-1 min-w-0" 
            style={{ color: baseColors.grayText }}
          >
            Your Protection Level
          </h2>
          {shouldShowCheckButton && (
            <button
              className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap w-full md:w-auto"
              style={{
                backgroundColor: baseColors.brandPrimary,
                color: baseColors.white,
              }}
              onClick={handleCheckScript}
              disabled={isChecking || !siteId || !siteUrl}
            >
              {isChecking ? 'Checking...' : 'Check Protection Level'}
            </button>
          )}
        </div>
        {!isManagedAssurance && (
          <p 
            className="text-xs sm:text-sm md:text-base break-words mb-6 sm:mb-8" 
            style={{ color: baseColors.grayMuted }}
          >
            Upgrade to reduce legal risk and improve accessibility
          </p>
        )}
      </div>

      {/* Protection Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 sm:mt-6">
        {protectionLevels.map((level) => {
          const levelData = protectionLevelData[level];
          const IconComponent = levelData.icon;
          const isActive = level === currentLevel;
          const isManagedAssurance = level === 'Managed + Assurance';
          const isAutomation = level === 'Automation';

          const isManaged = level === 'Managed';
          
          // Determine border color based on level and active state
          const getBorderColor = () => {
            if (isActive && isManagedAssurance) return '#22c55e'; // Green only when active
            if (isActive && isAutomation) return baseColors.blueInfo; // Light blue for Automation
            if (isActive && isManaged) return '#0d9488'; // Teal for Managed
            if (isActive && !isManagedAssurance) return '#EF4444'; // Red for No protection
            return baseColors.grayBorder; // Default gray border for all non-active cards
          };

          // Determine background color based on level and active state
          const getBackgroundColor = () => {
            if (isActive && isManagedAssurance) return '#F0FDF4'; // Light green only when active
            if (isActive && isAutomation) return baseColors.blueLight; // Light blue background for Automation
            if (isActive && isManaged) return '#CCFBF1'; // Light teal background for Managed
            return baseColors.white; // Default white background for all non-active cards
          };

          // Determine tag color based on level
          const getTagColor = () => {
            if (isActive && isManagedAssurance) return '#22c55e'; // Green for Managed + Assurance
            if (isActive && isAutomation) return baseColors.blueInfo; // Light blue for Automation
            if (isActive && isManaged) return '#0d9488'; // Teal for Managed
            if (isActive) return '#EF4444'; // Red for No protection (default)
            return '#EF4444';
          };

          return (
            <div
              key={level}
              className="relative rounded-xl p-4 sm:p-5 flex flex-col items-center cursor-pointer stat-card-3d"
              style={{
                backgroundColor: getBackgroundColor(),
                border: 'none',
                boxShadow: isActive
                  ? '0 12px 24px rgba(51, 67, 173, 0.2), 0 6px 12px rgba(0, 0, 0, 0.15)'
                  : '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
                transform: isActive ? 'perspective(1000px) translateZ(20px) translateY(-6px) rotateY(0deg)' : 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'perspective(1000px) translateZ(25px) translateY(-8px) rotateY(3deg)';
                  e.currentTarget.style.boxShadow = '0 16px 32px rgba(51, 67, 173, 0.25), 0 8px 16px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {/* YOU ARE HERE Tag for active level */}
              {isActive && (
                <div
                  className="absolute -top-3 right-2 px-2 py-0.5 rounded text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: getTagColor(),
                    color: baseColors.white,
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    transform: 'translateZ(10px)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  YOU ARE HERE
                </div>
              )}

              {/* Icon */}
              <div 
                className="mb-3 sm:mb-4 transition-transform duration-300"
                style={{
                  transform: isActive ? 'translateZ(20px) scale(1.1)' : 'translateZ(0) scale(1)',
                  filter: isActive ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                }}
              >
                <IconComponent
                  className="w-10 h-10 sm:w-12 sm:h-12 transition-all duration-300"
                  style={{
                    color: isActive && isManaged
                      ? '#0d9488' // Teal for Managed when active
                      : isActive && isAutomation
                      ? baseColors.blueInfo 
                      : isActive && !isManagedAssurance 
                      ? '#EF4444' 
                      : isManagedAssurance 
                      ? '#22c55e' 
                      : levelData.color,
                  }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-base sm:text-lg font-bold mb-2 text-center"
                style={{ color: baseColors.grayText }}
              >
                {level}
              </h3>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtectionLevelCard;
