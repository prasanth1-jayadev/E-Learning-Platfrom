export const normalizePathForUrl = (filePath) => {
    if (!filePath) return null;
    
    return filePath.replace(/\\/g, '/');
};
