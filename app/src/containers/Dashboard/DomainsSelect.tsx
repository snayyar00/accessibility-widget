import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

interface siteDetails {
  url: string;
  id: number | string;
}

const DomainsSelect = ({ data, selectedOption, setSelectedOption }: any) => {
  const handleChange = (event: SelectChangeEvent) => {
    setSelectedOption(event.target.value);
  };

  if (!data?.getUserSites?.length) return null;

  const options: siteDetails[] = data.getUserSites;

  return (
    <FormControl fullWidth>
      <Select
        size="small"
        value={selectedOption || ''}
        onChange={handleChange}
        label={selectedOption || ''}
        className="[&>fieldset>legend>span]:hidden"
      >
        {options.map((site: siteDetails) => (
          <MenuItem key={site.id} value={site.url}>
            {site.url}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DomainsSelect;
