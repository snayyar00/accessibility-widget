import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import { Site } from '@/generated/graphql';

const DomainsSelect = ({ data, selectedOption, setSelectedOption }: any) => {
  const handleChange = (event: SelectChangeEvent) => {
    setSelectedOption(event.target.value);
  };

  if (!data?.getUserSites?.length) return null;

  const options: Site[] = data.getUserSites;

  return (
    <FormControl fullWidth>
      <Select
        size="small"
        value={selectedOption || ''}
        onChange={handleChange}
        label={selectedOption || ''}
        className="[&>fieldset>legend>span]:hidden"
        renderValue={(value) => value}
      >
        {options.map((site: Site, idx: number) => (
          <MenuItem key={site.id ?? site.url ?? idx} value={site.url ?? ''}>
            <div className="flex flex-nowrap items-center min-w-0 max-w-full text-[15px] justify-between w-full">
              <span className="min-w-0 max-w-full truncate">{site.url}</span>

              <div className="flex flex-nowrap gap-[5px] flex-none ml-8 min-w-0 max-w-full">
                {!site.is_owner && !site?.workspaces?.length && (
                  <Chip
                    variant="outlined"
                    color="info"
                    size="small"
                    label={site.user_email}
                  />
                )}

                {!!site?.workspaces?.length && (
                  <Chip
                    variant="outlined"
                    color="primary"
                    size="small"
                    label="Workspace"
                  />
                )}

                {site.is_owner && (
                  <Chip
                    variant="outlined"
                    color="success"
                    size="small"
                    label="Owner"
                  />
                )}
              </div>
            </div>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DomainsSelect;
