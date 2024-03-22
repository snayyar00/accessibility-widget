import React from 'react';
import { useLottie } from "lottie-react";
import animationData from '../../assets/animations/websiteAnimation2.json';

type WebsiteScanAnimationProps = {
  className: string | undefined;
};

export default function WebsiteScanAnimation({ className }: WebsiteScanAnimationProps) {

  const options = {
    animationData,
    loop: true,
    className,
    style: {height: '40%', width: '40%'}
  };

  const { View } = useLottie(options);

  return (<div className={`flex flex-col items-center justify-center ${className}`}>
    {View}
    <p className='text-primary mt-2 text-lg'>Scanning for accessibility issues...</p>
  </div>);

}