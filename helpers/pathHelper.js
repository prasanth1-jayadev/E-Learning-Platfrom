export const normalizePathForUrl = (filePath) => {
    if (!filePath) return null;
    // Convert backslashes to forward slashes for URLs
    return filePath.replace(/\\/g, '/');
};
