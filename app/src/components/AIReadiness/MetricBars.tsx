import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface MetricBarsProps {
  metrics: {
    label: string;
    score: number;
    status: 'pass' | 'warning' | 'fail';
    category?: 'page' | 'domain' | 'ai';
    details?: string;
    recommendation?: string;
    actionItems?: string[];
  }[];
}

const MetricBars: React.FC<MetricBarsProps> = ({ metrics }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const getBarColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'fail':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getBulletColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'fail':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  // Sort metrics by score descending
  const sortedMetrics = [...metrics].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {sortedMetrics.map((metric, index) => {
        const isExpanded = expandedItems.has(metric.label);

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="space-y-0"
          >
            <div
              className={`grid grid-cols-12 gap-2 items-center p-2 -m-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                isExpanded ? 'bg-gray-100' : ''
              }`}
              onClick={() => toggleExpanded(metric.label)}
            >
              {/* Bullet and Label - fixed width */}
              <div className="col-span-4 flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${getBulletColor(
                    metric.status,
                  )}`}
                />
                <span className="text-sm text-gray-900 truncate">
                  {metric.label}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-auto"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>

              {/* Bar container - flexible width */}
              <div className="col-span-7 relative">
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  {/* Animated bar */}
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${getBarColor(
                      metric.status,
                    )} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(metric.score, 2)}%` }}
                    transition={{
                      delay: 0.2 + index * 0.05,
                      duration: 0.8,
                      ease: 'easeOut',
                    }}
                  >
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-10 rounded-full" />
                  </motion.div>

                  {/* Score indicator lines at key thresholds */}
                  {[40, 60, 80].map((threshold) => (
                    <div
                      key={threshold}
                      className="absolute top-0 bottom-0 w-px bg-gray-300 opacity-30"
                      style={{ left: `${threshold}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Score value - fixed width */}
              <div className="col-span-1 text-right">
                <span className="text-sm font-medium text-orange-600">
                  {metric.score}%
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && metric.details && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-14 pr-3 py-3 space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="text-sm text-gray-900">
                        {metric.details}
                      </div>
                    </div>
                    {metric.recommendation && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Recommendation
                        </div>
                        <div className="text-sm text-gray-600">
                          {metric.recommendation}
                        </div>
                      </div>
                    )}
                    {metric.actionItems && metric.actionItems.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Action Items
                        </div>
                        <ul className="space-y-1">
                          {metric.actionItems.map((item: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-600"
                            >
                              <span className="text-orange-500 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 pt-3 border-t border-gray-200"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl text-green-600">
              {metrics.filter((m) => m.status === 'pass').length}
            </div>
            <div className="text-xs text-gray-500">Passing</div>
          </div>
          <div>
            <div className="text-2xl text-yellow-500">
              {metrics.filter((m) => m.status === 'warning').length}
            </div>
            <div className="text-xs text-gray-500">Warning</div>
          </div>
          <div>
            <div className="text-2xl text-red-500">
              {metrics.filter((m) => m.status === 'fail').length}
            </div>
            <div className="text-xs text-gray-500">Failing</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MetricBars;
