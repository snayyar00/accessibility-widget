import { Box, Card, Typography, Divider } from '@mui/material';
import { FaCheckCircle, FaLanguage } from 'react-icons/fa';
import { MdBusiness, MdDomain, MdLocalOffer } from 'react-icons/md';

interface AppSumoInfoProps {
  validatedCoupons: string[];
  activeSites?: number;
  currentPlan?: string;
  maxSites?: number;
}

export default function AppSumoInfo({
  validatedCoupons = [],
  activeSites = 3,
}: AppSumoInfoProps) {
  let maxSites = activeSites;
  let currentPlan = 'Professional';

  if(activeSites <= 2){
    maxSites = 2;
    currentPlan = 'Starter';
  }
  else if(activeSites <= 4){
    maxSites = 4;
    currentPlan = 'Medium';
  }
  else{
    maxSites = 6;
    currentPlan = 'Enterprise';
  }

  return (
    <Card
      className="sm:w-full md:w-96 border mx-2 border-dark-gray !rounded-[10px] mb-1 overflow-hidden bg-white"
      elevation={0}
    >
      <Box className="p-4 pb-0">
        <Box className="flex items-center gap-2 mb-6 mt-2">
          <MdBusiness className="text-primary" size={18} />
          <Typography className="!font-bold !text-[22px] !leading-[30px] text-sapphire-blue">
            AppSumo Subscription
          </Typography>
        </Box>

        <Box className="space-y-4">
          {/* Active Coupons */}
          <Box className="space-y-2">
            <Box className="flex items-center gap-2">
              <MdLocalOffer className="text-primary" size={16} />
              <Typography className="text-sm font-medium text-gray-700">
                Valid Coupons
              </Typography>
            </Box>
            <Box className="flex flex-wrap">
              {validatedCoupons.length > 0 ? (
                validatedCoupons.map((code, index) => (
                  <span
                    key={index}
                    className="inline-block bg-green  text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full"
                  >
                    {code}
                  </span>
                ))
              ) : (
                <Typography className="text-sm text-gray-500">
                  No active coupons
                </Typography>
              )}
            </Box>
          </Box>

          <Divider className="border-gray-200" />

          {/* Plan and Sites */}
          <Box className="grid grid-cols-2 gap-4 pb-4">
            {/* Current Plan */}
            <Box className="space-y-2">
              <Box className="flex items-center gap-2">
                <FaCheckCircle className="text-primary" size={14} />
                <Typography className="text-sm font-medium text-gray-700">
                  Current Level
                </Typography>
              </Box>
              <span className="inline-block bg-primary text-white text-sm font-medium px-3 py-1 rounded-full">
                {currentPlan}
              </span>
            </Box>

            {/* Active Sites */}
            <Box className="space-y-2">
              <Box className="flex items-center gap-2">
                <MdDomain className="text-primary" size={16} />
                <Typography className="text-sm font-medium text-gray-700">
                  Active Sites
                </Typography>
              </Box>
              <Box className="flex items-center gap-2">
                <Typography className="text-sm font-medium text-gray-800">
                  {activeSites} of {maxSites}
                </Typography>
                <Box className="ml-1 flex-1 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                  <Box
                    className="h-full bg-primary rounded-full"
                    sx={{ width: `${(activeSites / (maxSites || 1)) * 100}%` }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
