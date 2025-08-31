export interface Email {
  email: string;
  type: 'personal' | 'generic';
  confidence: number;
  firstName?: string;
  lastName?: string;
}

export interface Lead {
  id: string;
  googlePlaceId?: string;
  businessName: string;
  website?: string;
  address?: string;
  phone?: string;
  category?: string;
  locationLat?: number;
  locationLng?: number;
  emails?: Email[];
  emailStatus?: 'not_searched' | 'searching' | 'found' | 'not_found';
  createdAt?: string;
}

export interface SearchParams {
  category: string;
  location: string;
  radius?: number;
  maxResults?: number;
  jobTitle?: string;
  companySize?: string;
  useEnrichedSearch?: boolean;
  aiMode?: boolean;
  aiQuery?: string;
}

export interface LeadSearchResult {
  leads: Lead[];
  totalCount: number;
}

export interface EmailFinderResponse {
  email?: string;
  type: 'personal' | 'generic';
  confidence: number;
  status: 'valid' | 'invalid' | 'unknown';
}

export interface LeadFinderProps {
  // Props for main container if needed
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

export interface LeadTableProps {
  leads: Lead[];
  selectedLeads: string[];
  onSelectLead: (leadId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onFindEmail: (leadId: string, domain: string, firstName?: string, lastName?: string) => void;
  onGenerateReport: (lead: Lead) => void;
  onSaveLead: (lead: Lead) => void;
}

export interface ExportButtonProps {
  leads: Lead[];
}