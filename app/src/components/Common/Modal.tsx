import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

type Overlay = {
  isOpen: boolean;
}

type Props = {
  isOpen: Overlay["isOpen"];
  children: React.ReactNode | React.ReactNode[];
}

const focusableSelectors =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal: React.FC<Props> = ({ isOpen, children }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    lastActiveRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

    const focusables = getFocusable();
    const first = focusables[0];

    if (first) {
      first.focus();
    } else {
      dialog.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentFocusables = getFocusable();
      if (currentFocusables.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = currentFocusables.indexOf(
        document.activeElement as HTMLElement,
      );

      let nextIndex = currentIndex;
      if (event.shiftKey) {
        nextIndex =
          currentIndex <= 0
            ? currentFocusables.length - 1
            : currentIndex - 1;
      } else {
        nextIndex =
          currentIndex === currentFocusables.length - 1
            ? 0
            : currentIndex + 1;
      }

      event.preventDefault();
      currentFocusables[nextIndex].focus();
    };

    dialog.addEventListener('keydown', handleKeyDown);

    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      const last = lastActiveRef.current as HTMLElement | null;
      if (last && document.contains(last)) {
        last.focus();
      }
    };
  }, [isOpen]);

  return (
    <div
      className={cn(
        'fixed inset-0 w-full h-full flex items-center justify-center bg-[#273259] bg-opacity-[0.42] z-50 p-4',
        { hidden: !isOpen },
      )}
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        className="bg-white w-[765px] max-w-[70%] sm:max-w-[90%] rounded-[10px] z-50 focus:outline-none max-h-[90vh] overflow-y-auto relative"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export default Modal;
