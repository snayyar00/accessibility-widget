import React from 'react';
import { useTranslation } from 'react-i18next';
import { Slide } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';
import '@/assets/css/react-slide-custom.css';
import squareGrid from '@/assets/images/svg/square-grid.svg';
import squareRadiusPrimary from '@/assets/images/svg/square-radius-primary.svg';

const AuthAdsArea: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center items-center h-full relative">
      <div className="absolute w-[129px] h-[121px] top-[164px] right-[50px]">
        <img src={squareGrid} alt="" />
      </div>
      <div className="absolute top-[180px] left-[56px]">
        <img src={squareRadiusPrimary} alt="" />
      </div>
      <div className="absolute left-[38px] bottom-[110px] border-[1px] border-solid border-light-blue rounded-[50%] w-[58px] h-[58px]" />
      <div className="max-w-full h-full [&>div]:h-full">
        <Slide
          easing="ease"
          arrows={false}
          canSwipe
          duration={2000}
          indicators={false}
        >
          <div>
            <div className="max-w-[70%] block mx-auto my-0 mt-16 text-center">
              <img src="https://www.webability.io/images/section_1_right.png" alt="Graphic showing increase in accessibility score" className="mx-auto my-0 max-w-full" />
              <h4 className="font-bold text-[26px] leading-[36px] text-center tracking-[0.5px] text-white mt-[82px] mb-[12px]">
                {t('Advertisement.ad1_title')}
              </h4>
              <div className="text-[14px] leading-6 text-center text-white">
                {t('Advertisement.ad1')}
              </div>
            </div>
          </div>
          <div>
            <div className="max-w-[60%] block mx-auto my-0 text-center">
              <img src="https://www.webability.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsection5-solution.85714b87.png&w=1920&q=75" alt="Screenshot of the webability accessibility widget working on a real website" className="mx-auto my-0 max-w-full" />
              <div className="font-bold text-[26px] leading-[36px] text-center tracking-[0.5px] text-white mt-[82px] mb-[12px]">
                {t('Advertisement.ad2_title')}
              </div>
              <div className="text-[14px] leading-6 text-center text-white">
                {t('Advertisement.ad2')}
              </div>
            </div>
          </div>
          <div>
            <div className="max-w-[80%] block mx-auto my-0 mt-20 text-center">
              <img src="https://www.webability.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fpartner-banner.aa45114f.png&w=1080&q=75" alt="Become a WebAbility partner" className="mx-auto my-0 max-w-full" />
              <div className="font-bold text-[26px] leading-[36px] text-center tracking-[0.5px] text-white mt-[82px] mb-[12px]">
                {t('Advertisement.ad3_title')}
              </div>
              <div className="text-[14px] leading-6 text-center text-white">
                {t('Advertisement.ad3')}
              </div>
            </div>
          </div>
        </Slide>
      </div>
    </div>
  );
};
export default React.memo(AuthAdsArea);
