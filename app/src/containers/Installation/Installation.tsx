import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import accessibilityBannerImage from '../../assets/images/accessibilityBannerImage.png'
import CodeContainer from './CodeContainer';
import getUniqueToken from '../../queries/uniqueToken/getUniqueToken';

export default function Installation({ domain }: any) {
  const { data, loading, refetch } = useQuery(getUniqueToken, { variables: { url: domain } });
  

  function getCodeString(uniqueToken: string):string {
    return `
<script src="https://webabilityv.ca/webAbilityV1.0.min.js" 
    token="${uniqueToken}"
    data-asw-lang="en">
</script>
  `;
  }

  const [codeString, setCodeString] = useState(getCodeString(''));


  useEffect(() => {
    if (loading === false && data.getVisitorTokenByWebsite !== 'none') {
      setCodeString(getCodeString(data.getVisitorTokenByWebsite));
    }
  }, [loading]);


  useEffect(() => { refetch() }, [domain]);


  return (
    <div>
      <div className='rounded-xl bg-[#B1D4DB] w-[80vw] sm:w-[90vw] p-10 mx-auto flex sm:flex-col sm:items-center justify-between'>
        <div className='w-[60%] sm:w-[80%] my-auto'>
          <h1 className='text-3xl text-sapphire-blue font-medium'>Install WebAbility Widget</h1>
          <p className='text-lg mt-10 font-light'>Easily install WebAbility widget on your website and improve it&apos;s accessibility in seconds!</p>
        </div>
        <img src={accessibilityBannerImage} className='w-[30%] sm:w-[50%] sm:mt-5' alt="Improved Accessibility with Webability.io" />

      </div>

      <CodeContainer codeString={codeString} />
    </div>
  )
}