function allowClientOrigin(req, res, next) {
    const configured = process.env.CLIENT_ORIGIN;
    if (!configured) return next();

    res.vary('Origin');
    if (req.get('Origin') !== configured) return next();

    res.set('Access-Control-Allow-Origin', configured);
    if (req.method === 'OPTIONS' && req.get('Access-Control-Request-Method')) {
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH');
        res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        return res.sendStatus(204);
    }
    return next();
}

module.exports = allowClientOrigin;
