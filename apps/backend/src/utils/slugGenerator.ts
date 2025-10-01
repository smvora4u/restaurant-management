import { Restaurant } from '../models/index.js';

export const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Check if the base slug is available
  const existingRestaurant = await Restaurant.findOne({ slug });
  if (!existingRestaurant) {
    return slug;
  }
  
  // If not available, append a number
  let counter = 1;
  let uniqueSlug = `${slug}-${counter}`;
  
  while (await Restaurant.findOne({ slug: uniqueSlug })) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
  
  return uniqueSlug;
};
