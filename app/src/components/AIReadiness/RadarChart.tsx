import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface RadarChartProps {
  data: {
    label: string;
    score: number;
    maxScore?: number;
  }[];
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, size = 300 }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const center = size / 2;
  const radius = size / 2 - 60; // Increased padding for labels
  const angleStep = (Math.PI * 2) / data.length;

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  // Calculate points for the polygon
  const getPoint = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Create polygon points string
  const polygonPoints = data
    .map((item, i) => {
      const point = getPoint(isAnimated ? item.score : 0, i);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  // Grid levels
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="relative">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient
            id="radar-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
          </linearGradient>
          <filter id="radar-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * radius}
            fill="none"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(0,0,0,0.05)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <motion.polygon
          points={polygonPoints}
          fill="url(#radar-gradient)"
          stroke="#3B82F6"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          filter="url(#radar-glow)"
        />

        {/* Data points */}
        {data.map((item, i) => {
          const point = getPoint(item.score, i);
          return (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3B82F6"
              stroke="white"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: isAnimated ? 1 : 0 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
            />
          );
        })}

        {/* Labels */}
        {data.map((item, i) => {
          const angle = i * angleStep - Math.PI / 2;
          // Responsive label distance - closer on mobile
          const isMobile = window.innerWidth < 640;
          const labelRadius = radius + (isMobile ? 25 : 40);
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);

          // Better text anchor logic based on quadrant
          let textAnchor = 'middle';
          let dy = 0;

          // Left side
          if (x < center - 20) {
            textAnchor = 'end';
          }
          // Right side
          else if (x > center + 20) {
            textAnchor = 'start';
          }

          // Top
          if (y < center - 20) {
            dy = -5;
          }
          // Bottom
          else if (y > center + 20) {
            dy = 5;
          }

          // Responsive sizing for mobile
          const rectWidth = isMobile ? 50 : 60;
          const rectHeight = isMobile ? 18 : 20;
          const rectOffset = isMobile
            ? 25
            : textAnchor === 'middle'
            ? 30
            : textAnchor === 'end'
            ? 60
            : 0;

          return (
            <motion.g key={i}>
              {/* Background for better readability */}
              <motion.rect
                x={x - rectOffset}
                y={y - rectHeight / 2}
                width={rectWidth}
                height={rectHeight}
                fill="white"
                fillOpacity={0.9}
                rx={4}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.05 }}
              />
              <motion.text
                x={x}
                y={y + dy}
                textAnchor={textAnchor as any}
                dominantBaseline="middle"
                className={`${
                  isMobile ? 'text-[10px]' : 'text-xs'
                } fill-gray-700 font-medium`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.05 }}
                style={{ pointerEvents: 'none' }}
              >
                {item.label}
              </motion.text>
              {/* Score value */}
              <motion.text
                x={x}
                y={y + dy + (isMobile ? 10 : 12)}
                textAnchor={textAnchor as any}
                dominantBaseline="middle"
                className={`${
                  isMobile ? 'text-[8px]' : 'text-[10px]'
                } fill-blue-600 font-bold`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 + i * 0.05 }}
                style={{ pointerEvents: 'none' }}
              >
                {item.score}%
              </motion.text>
            </motion.g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex flex-row gap-4 text-xs text-gray-500 bg-white px-4 py-2 rounded shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="whitespace-nowrap">80-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="whitespace-nowrap">60-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-300" />
            <span className="whitespace-nowrap">&lt;60%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarChart;
