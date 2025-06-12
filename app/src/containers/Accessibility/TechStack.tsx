import React from 'react';
import { motion } from 'framer-motion';
import { Laptop, Server, Code, BarChart, AlertCircle, Layers, ShoppingCart, TrendingUp } from 'lucide-react';

type TechStackProps = {
  techStack: {
    technologies: string[];
    categorizedTechnologies: { category: string; technologies: string[] }[];
    confidence: string;
    accessibilityContext: {
      platform: string;
      platform_type: string;
      has_cms: boolean;
      has_ecommerce: boolean;
      has_framework: boolean;
      is_spa: boolean;
    };
    analyzedUrl: string;
    analyzedAt: string;
    source: string;
  };
};

const TechStack: React.FC<TechStackProps> = ({ techStack }) => {
  if (!techStack) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-md font-medium text-gray-700">Technology Stack</h3>
            <p className="text-sm text-gray-500">No technology stack data available.</p>
          </div>
        </div>
      </div>
    );
  }

  const categorizedTech = techStack.categorizedTechnologies || [];
  const allTechs = techStack.technologies || [];
  type ConfidenceLevel = 'high' | 'medium' | 'low';
  const confidenceColorMap: Record<ConfidenceLevel, string> = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-gray-600',
  };
  const confidenceLevel: ConfidenceLevel =
    parseFloat(techStack.confidence) > 80
      ? 'high'
      : parseFloat(techStack.confidence) > 50
        ? 'medium'
        : 'low';
  const confidenceColor = confidenceColorMap[confidenceLevel];

  const accessibilityContext = techStack.accessibilityContext;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Laptop className="w-5 h-5 text-blue-500" />
        <h3 className="text-md font-medium text-gray-800">Technology Stack</h3>
        <span className={`text-xs ${confidenceColor} ml-auto`}>
          {techStack.confidence
            ? `${Math.round(parseFloat(techStack.confidence))}% confident`
            : 'Low confidence'}
        </span>
      </div>

      {accessibilityContext && (
        <div className="mb-3 p-2 bg-blue-50 rounded-md">
          <div className="text-xs text-blue-600 font-medium">Platform:</div>
          <div className="text-sm text-blue-800">
            {accessibilityContext.platform}
            {accessibilityContext.platform_type && ` (${accessibilityContext.platform_type})`}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {accessibilityContext.has_cms && '✓ CMS'}
            {accessibilityContext.has_ecommerce && ' ✓ E-commerce'}
            {accessibilityContext.has_framework && ' ✓ Framework'}
            {accessibilityContext.is_spa && ' ✓ SPA'}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categorizedTech.length > 0 ? (
          categorizedTech.map((category, index) => (
            <div key={index} className="border-t pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                {getCategoryIcon(category.category)}
                <span className="text-sm font-medium text-gray-700">{category.category}</span>
                <span className="text-xs text-gray-500 ml-1">({category.technologies.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {category.technologies.map((tech, techIndex) => (
                  <span
                    key={techIndex}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Code className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Detected Technologies</span>
              <span className="text-xs text-gray-500 ml-1">({allTechs.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTechs.map((tech, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {techStack.source === 'external_api' && (
        <div className="mt-3 text-xs text-gray-500">Powered by AI-enhanced technology detection</div>
      )}
    </motion.div>
  );
};

function getCategoryIcon(category: string | undefined) {
  switch (category?.toLowerCase()) {
    case 'frontend':
    case 'framework':
      return <Code className="w-4 h-4 text-indigo-500" />;
    case 'backend':
    case 'cms':
      return <Laptop className="w-4 h-4 text-green-500" />;
    case 'server':
      return <Server className="w-4 h-4 text-red-500" />;
    case 'analytics':
      return <BarChart className="w-4 h-4 text-yellow-500" />;
    case 'e-commerce':
    case 'ecommerce':
      return <ShoppingCart className="w-4 h-4 text-purple-500" />;
    case 'performance':
      return <TrendingUp className="w-4 h-4 text-orange-500" />;
    case 'accessibility':
      return <Layers className="w-4 h-4 text-pink-500" />;
    default:
      return <Code className="w-4 h-4 text-gray-500" />;
  }
}

export default TechStack;