import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import scan24hrsImage from "@/assets/images/webabilityScan24hrs.png"
import remediateImage from "@/assets/images/webabilityRemediate.png"
import auditImage from "@/assets/images/webabilityAudit.png"
const steps = [
  {
    id: "audit",
    number: "01",
    title: "Audit",
    description:
      "Once webability is installed on your website, it immediately uses advanced AI technology to scan your website and identify accessibility issues",
    image: auditImage,
    bgColor: "bg-slate-100",
  },
  {
    id: "remediate",
    number: "02",
    title: "Remediate",
    description:
      "webability automatically remediates accessibility issues found during the audit, enabling keyboard navigation and use with screen readers",
    image: remediateImage,
    bgColor: "bg-slate-50",
  },
  {
    id: "monitor",
    number: "03",
    title: "Monitor",
    description:
      "After the initial audit, webability continues to scan and remediate your website every 24 hours, helping you maintain your site's accessibility",
    image: scan24hrsImage,
    bgColor: "bg-white",
  },
]

export default function AccessibilitySteps() {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  return (
    <div className="w-full max-w-5xl mx-auto p-2">
      <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
        {steps.map((step, index) => {
          const isHovered = hoveredStep === step.id
          const isExpanded = isHovered || hoveredStep === null

          return (
            <div
              key={step.id}
              className={`
                relative overflow-hidden rounded-3xl transition-all duration-500 ease-out cursor-pointer flex flex-col
                ${isHovered ? "flex-[2]" : hoveredStep === null ? "flex-1" : "flex-[0.6]"}
                border border-slate-200 shadow-sm
              `}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              {/* Image Section - Top */}
              <div
                className={`relative flex-1 bg-cover bg-center overflow-hidden ${step.id === "audit" ? "bg-sapphire-blue" : step.id === "remediate" ? "bg-white-blue" : "bg-light-primary"}`}
                style={{
                    backgroundImage: `url(${step.image})`,
                  }}
              >
              </div>

              {/* Text Section - Bottom */}
              <div className={`p-6 ${step.bgColor}`}>
                <h3 className="text-slate-800 text-2xl font-bold mb-4">{step.title}</h3>

                <div
                  className={`
                  transition-all duration-500 ease-out overflow-hidden
                  ${isHovered ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}
                `}
                >
                  <p className="text-slate-600 text-base leading-relaxed mb-6">{step.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-xl font-light">{step.number}</span>
                    <ArrowRight className="text-slate-400 w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
