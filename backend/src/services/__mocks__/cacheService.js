const getCachedUrl = jest.fn().mockResolvedValue(null);
const setCachedUrl = jest.fn().mockResolvedValue(undefined);
const deleteCachedUrl = jest.fn().mockResolvedValue(undefined);

module.exports = { getCachedUrl, setCachedUrl, deleteCachedUrl };
