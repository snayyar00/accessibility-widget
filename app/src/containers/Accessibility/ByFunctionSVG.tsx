import React from 'react';

interface ByFunctionSVGProps {
  text: string;
}

const ByFunctionSVG: React.FC<ByFunctionSVGProps> = ({ text }) => {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M10.125 20.625C10.125 21.1082 10.5168 21.5 11 21.5C11.4832 21.5 11.875 21.1082 11.875 20.625H10.125ZM11.875 1.375C11.875 0.891751 11.4832 0.5 11 0.5C10.5168 0.5 10.125 0.891751 10.125 1.375H11.875ZM18 20.625C18 21.1082 18.3918 21.5 18.875 21.5C19.3582 21.5 19.75 21.1082 19.75 20.625H18ZM19.75 1.375C19.75 0.891751 19.3582 0.5 18.875 0.5C18.3918 0.5 18 0.891751 18 1.375H19.75ZM2.25 20.625C2.25 21.1082 2.64175 21.5 3.125 21.5C3.60825 21.5 4 21.1082 4 20.625H2.25ZM4 1.375C4 0.891751 3.60825 0.5 3.125 0.5C2.64175 0.5 2.25 0.891751 2.25 1.375H4ZM3.125 14.9375C4.81637 14.9375 6.1875 13.5664 6.1875 11.875H4.4375C4.4375 12.5999 3.84987 13.1875 3.125 13.1875V14.9375ZM6.1875 11.875C6.1875 10.1836 4.81637 8.8125 3.125 8.8125V10.5625C3.84987 10.5625 4.4375 11.1501 4.4375 11.875H6.1875ZM3.125 8.8125C1.43363 8.8125 0.0625 10.1836 0.0625 11.875H1.8125C1.8125 11.1501 2.40013 10.5625 3.125 10.5625V8.8125ZM0.0625 11.875C0.0625 13.5664 1.43363 14.9375 3.125 14.9375V13.1875C2.40013 13.1875 1.8125 12.5999 1.8125 11.875H0.0625ZM10.125 8.8125V20.625H11.875V8.8125H10.125ZM10.125 1.375V4.4375H11.875V1.375H10.125ZM12.3125 6.625C12.3125 7.34987 11.7249 7.9375 11 7.9375V9.6875C12.6914 9.6875 14.0625 8.31637 14.0625 6.625H12.3125ZM11 7.9375C10.2751 7.9375 9.6875 7.34987 9.6875 6.625H7.9375C7.9375 8.31637 9.30863 9.6875 11 9.6875V7.9375ZM9.6875 6.625C9.6875 5.90013 10.2751 5.3125 11 5.3125V3.5625C9.30863 3.5625 7.9375 4.93363 7.9375 6.625H9.6875ZM11 5.3125C11.7249 5.3125 12.3125 5.90013 12.3125 6.625H14.0625C14.0625 4.93363 12.6914 3.5625 11 3.5625V5.3125ZM18 17.5625V20.625H19.75V17.5625H18ZM18 1.375V13.1875H19.75V1.375H18ZM20.1875 15.375C20.1875 16.0999 19.5999 16.6875 18.875 16.6875V18.4375C20.5664 18.4375 21.9375 17.0664 21.9375 15.375H20.1875ZM18.875 16.6875C18.1501 16.6875 17.5625 16.0999 17.5625 15.375H15.8125C15.8125 17.0664 17.1836 18.4375 18.875 18.4375V16.6875ZM17.5625 15.375C17.5625 14.6501 18.1501 14.0625 18.875 14.0625V12.3125C17.1836 12.3125 15.8125 13.6836 15.8125 15.375H17.5625ZM18.875 14.0625C19.5999 14.0625 20.1875 14.6501 20.1875 15.375H21.9375C21.9375 13.6836 20.5664 12.3125 18.875 12.3125V14.0625ZM2.25 14.0625V20.625H4V14.0625H2.25ZM2.25 1.375V9.6875H4V1.375H2.25Z"
        fill={text === 'By Function' ? 'white' : 'black'}
      ></path>
    </svg>
  );
};

export default ByFunctionSVG;
