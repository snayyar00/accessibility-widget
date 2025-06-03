import { useState, useEffect } from "react"
import { AlertTriangle, CheckCircle, AlertCircle, DollarSign, Ban, Rocket } from "lucide-react"
import { CircularProgress, Box, Typography } from "@mui/material"

export default function WebAbilityWidget({score}:{score:number}) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Animate progress when state changes
  useEffect(() => {
    const targetValue = isEnabled ? 94 : score
    const startValue = progress
    const duration = 1500
    const startTime = performance.now()

    const animateProgress = (currentTime:number) => {
      const elapsedTime = currentTime - startTime
      const progress = Math.min(elapsedTime / duration, 1)
      // Use easeOutCubic for smoother animation
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentProgress = startValue + (targetValue - startValue) * easeProgress

      setProgress(currentProgress)

      if (progress < 1) {
        requestAnimationFrame(animateProgress)
      }
    }

    requestAnimationFrame(animateProgress)
  }, [isEnabled])

  const toggleSwitch = () => {
    setIsEnabled(!isEnabled)
  }

  if (!mounted) return null

  return (
    <div className="w-full sm:max-w-4xl md:max-w-5xl mx-auto p-2 bg-white rounded-xl transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-col justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="text-blue-600">
            <Rocket className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Try WebAbility Widget</h1>
        </div>

        {/* Custom Tailwind Switch */}
        <button
          onClick={toggleSwitch}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isEnabled ? "bg-green-500 focus:ring-green-500" : "bg-gray-600 focus:ring-gray-600"
          }`}
          aria-pressed={isEnabled}
          aria-label="Toggle accessibility features"
        >
          <span className="sr-only">{isEnabled ? "Disable" : "Enable"} accessibility features</span>
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
              isEnabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 ">
        {/* Compliance Status */}
        <div className="flex flex-col sm:flex-col items-center gap-6 p-6 rounded-xl bg-white shadow-lg border-gray-100 border">
          <div className="relative w-28 h-28 flex-shrink-0">
            {/* MUI CircularProgress with animations */}
            <Box sx={{ position: "relative", display: "inline-flex", width: 112, height: 112 }}>
              {/* Gray background track */}
              <CircularProgress
                variant="determinate"
                value={100}
                size={112}
                thickness={4}
                sx={{
                  color: "#e5e7eb", // Light gray color for the track
                  position: "absolute",
                  left: 0,
                }}
              />
              {/* Colored progress indicator */}
              <CircularProgress
                variant="determinate"
                value={progress}
                size={112}
                thickness={4}
                sx={{
                  color: isEnabled ? "#4ade80" : "#3b82f6",
                  transition: "color 0.5s ease-in-out",
                  position: "absolute",
                  left: 0,
                  "& .MuiCircularProgress-circle": {
                    strokeLinecap: "round",
                    transition: "all 0.5s ease-in-out",
                  },
                }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    fontWeight: "bold",
                    fontSize: "28px",
                    transition: "all 0.5s ease-in-out",
                    opacity: progress > 5 ? 1 : 0,
                    transform: progress > 5 ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  {Math.round(progress)}%
                </Typography>
              </Box>
            </Box>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              {isEnabled ? (
                <CheckCircle className="text-green-500 h-6 w-6 transition-colors duration-300" />
              ) : (
                <AlertTriangle className="text-red-600 h-6 w-6 transition-colors duration-300" />
              )}
              <span className="text-xl font-bold text-gray-800 transition-colors duration-300">
                {isEnabled ? "Compliant" : "Not Compliant"}
              </span>
            </div>
            <p className="text-base text-gray-600 transition-colors duration-300 max-w-sm">
              {isEnabled ? "Your site meets WCAG 2.1 AA standards" : "Your site needs accessibility improvements"}
            </p>
          </div>
        </div>

        {/* Risk Level */}
        <div className="flex flex-col justify-center sm:flex-col items-center gap-6 p-6 bg-white shadow-lg border-gray-100 border rounded-xl">
          <div
            className={`w-16 h-16 ${
              isEnabled ? "bg-green-200" : "bg-red-200"
            } rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300`}
          >
            {isEnabled ? (
              <CheckCircle className="text-green-500 h-8 w-8 transition-colors duration-300" />
            ) : (
              <AlertTriangle className="text-red-600 h-8 w-8 transition-colors duration-300" />
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-600 mb-2 transition-colors duration-300">
              {isEnabled ? "Low Risk" : "High Risk"}
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              
              <span className="text-base text-gray-600 transition-colors duration-300">
                {isEnabled ? "Issues Resolved" : "Multiple violations detected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Risk Alert */}
      <div className="hidden md:block">
        <div className="bg-red-200 border-l-4 border-red-600 p-6 rounded-r-lg mb-6">
          <h2 className="flex items-center gap-2 text-red-800 text-xl font-bold mb-6">
            <AlertCircle className="h-6 w-6" />
            Critical Risk Alert
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Legal Exposure */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="flex items-center gap-2 text-red-800 font-semibold text-base mb-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 21H21M6 18V21M10 14V21M14 14V21M18 18V21M3 4L6 7L10 3L14 7L18 3L21 7V11H3V4Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Legal Exposure
              </h3>
              <p className="text-gray-600 text-sm">
                Your website may be vulnerable to ADA lawsuits, which increased by 400% in 2023.
              </p>
            </div>

            {/* Financial Risk */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="flex items-center gap-2 text-red-800 font-semibold text-base mb-2">
                <DollarSign className="h-5 w-5" />
                Financial Risk
              </h3>
              <p className="text-gray-600 text-sm">
                Average settlement costs range from $10,000 to $50,000 per lawsuit.
              </p>
            </div>

            {/* Compliance Gaps */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="flex items-center gap-2 text-red-800 font-semibold text-base mb-2">
                <Ban className="h-5 w-5" />
                Compliance Gaps
              </h3>
              <p className="text-gray-600 text-sm">
                119 violations found, including 3 critical issues requiring immediate attention.
              </p>
            </div>

            {/* Lost Opportunities */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="flex items-center gap-2 text-red-800 font-semibold text-base mb-2">
                <Ban className="h-5 w-5" />
                Lost Opportunities
              </h3>
              <p className="text-gray-600 text-sm">
                Estimated 15-20% of potential customers cannot access your content.
              </p>
            </div>
          </div>

          {/* Time Sensitive Warning */}
          <div className="bg-[#f37373] p-4 rounded-lg border border-red-200">
            <p className="text-red-800 text-base">
              <span className="font-bold">Time Sensitive:</span> The longer you wait, the higher the risk. Most
              businesses receive legal notices within 30 days of being identified as non-compliant.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
