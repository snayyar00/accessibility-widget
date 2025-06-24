import { addOrganization, editOrganization, removeOrganization, CreateOrganizationInput, organizationExistsByName, getOrganizationById, getOrganizations } from '~/services/organization/organization.service';
import { Organization } from '~/repository/organization.repository';
import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization.resolver';

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

interface RemoveOrganizationArgs {
  id: number;
}

const organizationResolver = {
  Query: {
     getUserOrganizations: combineResolvers(
      isAuthenticated,
      async (_: unknown, __: unknown, { user }): Promise<Organization[]> => {
        const orgs = await getOrganizations(user);

        return orgs || [];
      }
    ),

    async organizationExists(_: unknown, { name }: { name: string }): Promise<boolean> {
      return await organizationExistsByName(name);
    },
  },
  Mutation: {
    addOrganization: combineResolvers(
      isAuthenticated,
      async (_: unknown, args: AddOrganizationArgs, { user }): Promise<Organization | null> => {
        const id = await addOrganization(args, user);

        if (id) {
          const newUser = {
            ...user,
            organization_ids: [...(user.organization_ids ?? []), id],
          };
          
          const org = await getOrganizationById(id, newUser);

          return org || null;
        }

        return null;
      }
    ),

    editOrganization: combineResolvers(
      isAuthenticated,
      async (_: unknown, args: EditOrganizationArgs, { user }): Promise<Organization | null> => {
        const { id, ...editData } = args;
        const updated = await editOrganization(editData, user, id);

        if (updated) {
          const org = await getOrganizationById(id, user);
          return org || null;
        }
        
        return null;
      }
    ),

    removeOrganization: combineResolvers(
      isAuthenticated,
      async (_: unknown, args: RemoveOrganizationArgs, { user }): Promise<boolean> => {
        const deleted = await removeOrganization(user, args.id);

        return !!deleted;
      }
    ),
  },
};

export default organizationResolver;