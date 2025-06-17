import { addOrganization, editOrganization, removeOrganization, getOrganization, getOrganizationById, CreateOrganizationInput, organizationExistsByName } from '~/services/organization/organization.service';
import { Organization } from '~/repository/organization.repository';

interface AddOrganizationArgs {
  name: string;
  logo_url?: string;
  settings?: any;
}

interface EditOrganizationArgs {
  id: number;
  name?: string;
  logo_url?: string;
  settings?: any;
}

export const organizationResolver = {
  Query: {
    async organization(_: unknown, { subdomain }: { subdomain: string }): Promise<Organization | null> {
      const org = await getOrganization(subdomain);

      return org || null;
    },

    async organizationById(_: unknown, { id }: { id: number }): Promise<Organization | null> {
      const org = await getOrganizationById(Number(id));

      return org || null;
    },

    async organizationExists(_: unknown, { name }: { name: string }): Promise<boolean> {
      return await organizationExistsByName(name);
    },
  },
  Mutation: {
    async addOrganization(_: unknown, args: AddOrganizationArgs): Promise<Organization | null> {
      const ids = await addOrganization(args as CreateOrganizationInput);

      if (ids && ids.length > 0) {
        const org = await getOrganizationById(ids[0]);

        return org || null;
      }

      return null;
    },

    async editOrganization(_: unknown, args: EditOrganizationArgs): Promise<Organization | null> {
      const { id, ...data } = args;
      const updated = await editOrganization(Number(id), data);

      if (updated) {
        const org = await getOrganizationById(Number(id));

        return org || null;
      }

      return null;
    },

    async removeOrganization(_: unknown, args: { id: number }): Promise<boolean> {
      const deleted = await removeOrganization(Number(args.id));

      return !!deleted;
    },
  },
};
