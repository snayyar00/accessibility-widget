import { useEffect } from 'react';

type PropsTitle = {
  title: string;
};

const useDocumentHeader = ({ title }: PropsTitle): void => {
  useEffect(() => {
    if (!title) return;

    document.title = title;
  }, [title]);
};

type PropsDescription = {
  description: string | null;
};

export const useDocumentDescription = ({
  description,
}: PropsDescription): void => {
  useEffect(() => {
    if (!description) return;

    let meta = document.querySelector('meta[name="description"]');

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', description);
  }, [description]);
};

export default useDocumentHeader;
