import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check } from 'lucide-react'
import './ProgressIndicator.css'

interface Step {
  id: number
  title: string
  description: string
}

interface ProgressIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStep, className = "" }) => {
  const { t } = useTranslation()
  // Track previous step to animate in the right direction
  const [prevStep, setPrevStep] = useState(currentStep)
  const [animDirection, setAnimDirection] = useState<'forward' | 'backward'>('forward')

  // Add animation direction logic
  useEffect(() => {
    if (currentStep !== prevStep) {
      setAnimDirection(currentStep > prevStep ? 'forward' : 'backward')
      setPrevStep(currentStep)
    }
  }, [currentStep, prevStep])

  return (
    <div className={`progress-indicator w-full sm:max-w-4xl md:max-w-5xl mx-auto mb-12 px-4 ${className}`}>
      {/* Desktop version (horizontal) - hidden on small screens */}
      <div className="hidden md:flex items-center justify-between relative">
        {steps.map((step, index) => {
          // Determine step status
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          const isUpcoming = currentStep < step.id

          // Determine if we need to render a connector
          const isNotLastStep = index < steps.length - 1

          return (
            <React.Fragment key={step.id}>
              {/* Complete step column with title, circle, and description */}
              <div className="flex flex-col items-center relative z-10">
                {/* Step title */}
                <div className="mb-2 text-center">
                  <p 
                    className={`step-text text-base font-medium transform
                      ${isActive ? "active" : isCompleted ? "text-sapphire-blue" : "text-gray-700"}
                      ${isUpcoming && animDirection === 'forward' ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"}
                    `}
                  >
                    {t(step.title)}
                  </p>
                </div>
                
                {/* Circle with number or checkmark */}
                <div
                  className={`
                    step-circle flex items-center justify-center w-16 h-16 rounded-full mb-2 transform
                    ${isActive ? "active" : isCompleted ? "completed" : "bg-[#e5e7eb] text-gray-700"}
                    ${isUpcoming && animDirection === 'forward' ? "opacity-50" : "translate-y-0 opacity-100"}
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 animate-fadeScale" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                
                {/* Description */}
                <div className="text-center">
                  <p 
                    className={`step-text text-sm text-center transform
                      ${isActive ? "active" : ""}
                      ${isUpcoming && animDirection === 'forward' ? "opacity-50" : "translate-y-0 opacity-100"}
                    `}
                    style={isActive ? { color: '#0052CC' } : isCompleted ? { color: '#0052CC' } : { color: '#475569' }}
                  >
                    {t(step.description)}
                  </p>
                </div>
              </div>

              {/* Arrow connector between steps with flowing animation */}
              {isNotLastStep && (
                <div className="flex items-center -mx-8 justify-center relative" style={{ width: '220px' }}>
                  {/* Active/completed progress bar with animation */}
                  <div 
                    className="progress-bar bg-primary absolute left-0 h-10"
                    style={{ 
                      width: isCompleted ? '100%' : isActive ? '50%' : '0%',
                      transitionDelay: isActive ? '0.2s' : '0s'
                    }}
                  ></div>
                  
                  {/* Arrow indicator with sliding animation */}
                  <div 
                    className={`arrow-indicator absolute text-black transform ${
                      isCompleted ? "opacity-100" : 
                      isActive ? "translate-x-1/2 opacity-100" : 
                      "translate-x-0 opacity-0"
                    }`}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M9 6L15 12L9 18" 
                        stroke={isCompleted ? "#0052CC" : "#333"} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    </svg>
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Mobile version (vertical) - shown only on small screens */}
      <div className="md:hidden">
        {steps.map((step, index) => {
          // Determine step status
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          const isUpcoming = currentStep < step.id

          // Determine if we need to render a connector
          const isNotLastStep = index < steps.length - 1

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                {/* Circle with number or checkmark */}
                <div
                  className={`
                    step-circle flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full transform
                    ${isActive ? "active" : isCompleted ? "completed" : "bg-[#e5e7eb] text-gray-700"}
                    ${isUpcoming && animDirection === 'forward' ? "opacity-50" : "translate-x-0 opacity-100"}
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? <Check className="w-4 h-4 animate-fadeScale" /> : step.id}
                </div>
                
                {/* Step title and description */}
                <div className={`ml-4 flex-grow transform
                  ${isUpcoming && animDirection === 'forward' ? "translate-x-3 opacity-50" : "translate-x-0 opacity-100"}
                `}>
                  <p className={`step-text text-sm font-medium ${isActive ? "active" : "text-gray-800"}`}>
                    {t(step.title)}
                  </p>
                  <p 
                    className={`text-xs`}
                    style={isActive || isCompleted ? { color: '#0052CC' } : { color: '#475569' }}
                  >
                    {t(step.description)}
                  </p>
                </div>
              </div>

              {/* Vertical connector between steps with flowing animation */}
              {isNotLastStep && (
                <div className="ml-5 relative" style={{ height: '24px', width: '1px' }}>
                  {/* Background line */}
                  <div className="absolute w-0.5 h-full bg-light-grey"></div>
                  
                  {/* Progress line with animation */}
                  <div 
                    className="mobile-progress-line absolute bg-primary"
                    style={{ 
                      height: isCompleted ? '100%' : isActive ? '50%' : '0%',
                      top: 0
                    }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressIndicator
