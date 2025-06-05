import { fetchTechStackFromAPI } from '../../repository/techStack.repository';

const techStackResolver = {
  Query: {
    fetchTechStack: async (_: any, { url }: { url: string }) => {
      try {
        return await fetchTechStackFromAPI(url);
      } catch (error) {
        throw new Error(`Failed to fetch TechStack: ${error.message}`);
      }
    },
  },
};

export default techStackResolver;