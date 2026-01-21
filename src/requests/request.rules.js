const validTransitions = {
    OPEN: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: []
};

function canTransition(from, to) {
    return validTransitions[from] && validTransitions[from].includes(to);
}

module.exports = { canTransition };
