import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function usePortal(id: string): HTMLDivElement {
  const rootElemRef = useRef<HTMLElement>(null) as React.MutableRefObject<HTMLDivElement>;
  
  useEffect(() => {
    const existingParent: (HTMLDivElement | null) = document.querySelector(`#${id}`);
    const parentElem = existingParent || createRootElement();

    if (!existingParent) {
      addRootElement(parentElem);
    }

    // Get or create the root element
    const rootElem = getRootElem();
    
    // Only append if not already a child to prevent duplicate appends
    if (rootElem && rootElem.parentNode !== parentElem) {
      parentElem.appendChild(rootElem);
    }

    return function removeElement() {
      const rootElem = rootElemRef.current;
      
      // Safely remove the root element only if it exists and is still connected to the DOM
      if (rootElem) {
        try {
          // Check if the node is actually connected to the document before removing
          if (rootElem.isConnected && rootElem.parentNode) {
            rootElem.remove();
          }
        } catch (error) {
          // Silently handle any removal errors (node may already be removed by React)
          console.debug('Portal cleanup: node already removed', error);
        }
      }
      
      // Remove parent element only if it has no children
      // Use querySelector to verify it still exists in the DOM
      const parentStillExists = document.querySelector(`#${id}`);
      if (parentStillExists && parentStillExists.childNodes.length === 0) {
        try {
          parentStillExists.remove();
        } catch (error) {
          // Silently handle any removal errors
          console.debug('Portal cleanup: parent already removed', error);
        }
      }
    };
  }, [id]);

  function createRootElement() {
    const rootContainer = document.createElement('div');
    rootContainer.setAttribute('id', id);
    return rootContainer;
  }

  function addRootElement(rootElem: HTMLDivElement) {
    // Check if element already exists in DOM to prevent duplicate insertions
    if (rootElem.parentNode === document.body) {
      return;
    }
    
    // Check if an element with the same ID already exists
    const existingElement = document.querySelector(`#${id}`);
    if (existingElement && existingElement !== rootElem) {
      return;
    }
    
    try {
      // Use appendChild instead of insertBefore for safer DOM manipulation
      // This avoids race conditions with React's DOM updates
      document.body.appendChild(rootElem);
    } catch (error) {
      // Fallback: try insertBefore with null (which should append to end)
      // This handles edge cases where appendChild might fail
      try {
        document.body.insertBefore(rootElem, null);
      } catch (fallbackError) {
        console.error('Failed to add portal root element:', fallbackError);
      }
    }
  }

  function getRootElem() {
    if (!rootElemRef.current) {
      rootElemRef.current = document.createElement('div');
    }
    return rootElemRef.current;
  }
  return getRootElem();
}

type Props = {
  id: string;
  children: React.ReactNode | React.ReactNode[];
}

export default function Portal({ id, children }: Props): React.ReactPortal {
  const target = usePortal(id);
  return createPortal(children, target);
}
