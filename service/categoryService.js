import Category from '../models/Category.js';

// Get all listed categories (for users and tutors)
const getListedCategories = async () => {
    try {
        const categories = await Category.find({ status: 'listed' })
            .sort({ name: 1 })
            .select('name description');
        return categories;
    } catch (error) {
        console.error('Error fetching listed categories:', error);
        return [];
    }
};

// Get all categories (for admin)
const getAllCategories = async () => {
    try {
        const categories = await Category.find()
            .sort({ createdAt: -1 });
        return categories;
    } catch (error) {
        console.error('Error fetching all categories:', error);
        return [];
    }
};

// Get single category by ID
const getCategoryById = async (categoryId) => {
    try {
        const category = await Category.findById(categoryId);
        return category;
    } catch (error) {
        console.error('Error fetching category:', error);
        return null;
    }
};

export {
    getListedCategories,
    getAllCategories,
    getCategoryById
};
