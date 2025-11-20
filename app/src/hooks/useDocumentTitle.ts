import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

type PropsTitle = {
  title: string;
};

const useDocumentHeader = ({ title }: PropsTitle): void => {
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  const userOrganization = useSelector(
    (state: RootState) => state.user.data?.currentOrganization,
  );
  
  const organizationName = organization?.name || userOrganization?.name || 'WebAbility.io';

  useEffect(() => {
    if (!title) return;

    // Replace {{organizationName}} with actual organization name
    const processedTitle = title.replace(/\{\{organizationName\}\}/g, organizationName);

    document.title = processedTitle;
  }, [title, organizationName]);
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
