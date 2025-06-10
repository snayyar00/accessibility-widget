import type React from "react"
import { useState, useEffect } from "react"
import { Globe, TrendingUp, Shield, Users, Smartphone, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface AccessibilityFactsProps {
  isVisible: boolean
}

const AccessibilityFacts: React.FC<AccessibilityFactsProps> = ({ isVisible }) => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [factTransitioning, setFactTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const accessibilityFacts = [
    {
      icon: Globe,
      title: "Global Impact",
      fact: "Over 1.3 billion people worldwide live with some form of disability",
      description: "That's about 16% of the global population who benefit from accessible websites.",
      color: "from-[#10b981] to-[#059669]",
      bgColor: "bg-[#ecfdf5]",
      textColor: "text-[#047857]",
    },
    {
      icon: TrendingUp,
      title: "Business Benefits",
      fact: "Companies with inclusive practices are 35% more likely to outperform competitors",
      description: "Accessibility isn't just compliance—it's good business strategy.",
      color: "from-[#8b5cf6] to-[#7c3aed]",
      bgColor: "bg-[#f5f3ff]",
      textColor: "text-[#6d28d9]",
    },
    {
      icon: Shield,
      title: "Legal Protection",
      fact: "Web accessibility lawsuits increased by 320% in recent years",
      description: "Proactive compliance protects your business from costly legal issues.",
      color: "from-[#f59e0b] to-[#d97706]",
      bgColor: "bg-[#fffbeb]",
      textColor: "text-[#b45309]",
    },
    {
      icon: Users,
      title: "User Experience",
      fact: "Accessible design improves usability for everyone, not just disabled users",
      description: "Features like captions and good contrast benefit all users.",
      color: "from-[#f43f5e] to-[#e11d48]",
      bgColor: "bg-[#fff1f2]",
      textColor: "text-[#be123c]",
    },
    {
      icon: Smartphone,
      title: "Mobile Accessibility",
      fact: "71% of users with disabilities will leave a website that's not accessible",
      description: "Mobile accessibility is crucial as mobile usage continues to grow.",
      color: "from-[#06b6d4] to-[#2563eb]",
      bgColor: "bg-[#ecfeff]",
      textColor: "text-[#0e7490]",
    },
    {
      icon: Search,
      title: "SEO Benefits",
      fact: "Accessible websites typically rank 50% higher in search results",
      description: "Good accessibility practices align with SEO best practices.",
      color: "from-[#6366f1] to-[#2563eb]",
      bgColor: "bg-[#eef2ff]",
      textColor: "text-[#4338ca]",
    },
  ]

  const currentFact = accessibilityFacts[currentFactIndex]

  useEffect(() => {
    if (isVisible && !isPaused) {
      const factsInterval = setInterval(() => {
        setFactTransitioning(true)
        setTimeout(() => {
          setCurrentFactIndex((prev) => (prev + 1) % accessibilityFacts.length)
          setFactTransitioning(false)
        }, 300)
      }, 5000)

      return () => clearInterval(factsInterval)
    }
  }, [isVisible, isPaused, accessibilityFacts.length])

  const goToFact = (index: number) => {
    if (index !== currentFactIndex) {
      setFactTransitioning(true)
      setTimeout(() => {
        setCurrentFactIndex(index)
        setFactTransitioning(false)
      }, 300)
    }
  }

  const goToPrevious = () => {
    const prevIndex = currentFactIndex === 0 ? accessibilityFacts.length - 1 : currentFactIndex - 1
    goToFact(prevIndex)
  }

  const goToNext = () => {
    const nextIndex = (currentFactIndex + 1) % accessibilityFacts.length
    goToFact(nextIndex)
  }

  if (!isVisible) return null

  return (
    <div className="w-full -mt-7 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-[#111827] mb-2">Accessibility Insights</h3>
          <p className="text-[#4b5563] text-base sm:text-lg max-w-2xl mx-auto">
            Discover why accessibility matters while you wait
          </p>
        </div>

        {/* Main Fact Card */}
        <div
          className={`relative bg-[#ffffff] rounded-3xl shadow-xl border border-[#f3f4f6] overflow-hidden transition-all duration-500 ${
            factTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentFact.color} opacity-5`}></div>

          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#ffffff]/80 hover:bg-[#ffffff] rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Previous fact"
          >
            <ChevronLeft className="w-5 h-5 text-[#4b5563]" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#ffffff]/80 hover:bg-[#ffffff] rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Next fact"
          >
            <ChevronRight className="w-5 h-5 text-[#4b5563]" />
          </button>

          <div className="relative p-8 sm:p-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-20 h-20 ${currentFact.bgColor} rounded-2xl flex items-center justify-center shadow-lg`}
              >
                <currentFact.icon className={`w-10 h-10 ${currentFact.textColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 ${currentFact.bgColor} ${currentFact.textColor} text-sm font-medium rounded-full mb-3`}
                  >
                    {currentFact.title}
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-bold text-[#111827] leading-tight">{currentFact.fact}</h4>
                </div>
                <p className="text-[#4b5563] text-lg leading-relaxed max-w-2xl">{currentFact.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fact Indicators */}
        <div className="flex justify-center mt-8 space-x-3">
          {accessibilityFacts.map((fact, index) => (
            <button
              key={index}
              onClick={() => goToFact(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentFactIndex
                  ? `w-12 h-3 bg-gradient-to-r ${fact.color}`
                  : "w-3 h-3 bg-[#d1d5db] hover:bg-[#9ca3af]"
              }`}
              aria-label={`Go to fact ${index + 1}: ${fact.title}`}
            />
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          <div className="group bg-[#ffffff] rounded-2xl p-6 shadow-lg border border-[#f3f4f6] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#ef4444] to-[#db2777] bg-clip-text text-transparent mb-2">
                98%
              </div>
              <div className="text-[#4b5563] font-medium">of websites have accessibility issues</div>
            </div>
          </div>

          <div className="group bg-[#ffffff] rounded-2xl p-6 shadow-lg border border-[#f3f4f6] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#22c55e] to-[#16a34a] bg-clip-text text-transparent mb-2">
                2.5x
              </div>
              <div className="text-[#4b5563] font-medium">revenue increase with accessible sites</div>
            </div>
          </div>

          <div className="group bg-[#ffffff] rounded-2xl p-6 shadow-lg border border-[#f3f4f6] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent mb-2">
                15%
              </div>
              <div className="text-[#4b5563] font-medium">of users need accessibility features</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="w-full bg-[#e5e7eb] rounded-full h-1">
            <div
              className={`h-1 rounded-full bg-gradient-to-r ${currentFact.color} transition-all duration-5000 ease-linear`}
              style={{
                width: isPaused ? "100%" : "0%",
                animation: isPaused ? "none" : "progress 5s linear infinite",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessibilityFacts
