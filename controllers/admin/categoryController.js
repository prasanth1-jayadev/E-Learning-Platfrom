import Category from '../../models/Category.js';

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.render('admin/categories', { categories, currentPage: 'categories' });
    } catch (error) {
        console.error('Get categories error:', error);
        res.render('admin/categories', { categories: [], currentPage: 'categories' });
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        await Category.create({
            name: name.trim(),
            description: description ? description.trim() : '',
            status: 'listed'
        });

        res.json({ success: true, message: 'Category added successfully' });
    } catch (error) {
        console.error('Add category error:', error);
        res.status(500).json({ success: false, message: 'Failed to add category' });
    }
};

const editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const existing = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }

        category.name = name.trim();
        category.description = description ? description.trim() : '';
        await category.save();

        res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        console.error('Edit category error:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};

const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.status = category.status === 'listed' ? 'unlisted' : 'listed';
        await category.save();

        res.json({ success: true, message: 'Category status updated' });
    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

export { getCategories, addCategory, editCategory, toggleStatus };
