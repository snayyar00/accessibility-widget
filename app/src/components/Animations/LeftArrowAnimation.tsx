import React from 'react';
import { useLottie } from "lottie-react";
import animationData from '../../assets/animations/Arrow.json';


export default function LeftArrowAnimation() {

  const options = {
    animationData,
    loop: true,
    // style: {height: '10%', width: '10%'}
    // className:'mt-1'
  };

  const { View } = useLottie(options);

  return (<div className='w-[4.25rem] h-[4.25rem]'>
    {View}
  </div>);

}