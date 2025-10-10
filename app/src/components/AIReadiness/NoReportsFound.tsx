import React from 'react';
import { motion } from 'framer-motion';
import notFoundImage from '@/assets/images/not_found_image.png';

const NoReportsFound: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[500px] px-4"
    >
      {/* Icon/Image */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-10"
      >
        <img
          src={notFoundImage}
          alt="No reports found"
          className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain opacity-80"
        />
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-center"
      >
        <p className="text-gray-400 text-base sm:text-lg md:text-xl font-normal">
          No reports found matching your criteria.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default NoReportsFound;
