function validateRequest(data) {
    if (!data.title || !data.description || !data.category || !data.priority)
        throw new Error('Missing required fields');
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(data.priority))
        throw new Error('Invalid priority');
}

function validateStatusChange(status) {
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status))
        throw new Error('Invalid status');
}

module.exports = { validateRequest, validateStatusChange };
