function readAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return authHeader.split(' ')[1];
    }
    return null;
}

module.exports = {
    readAuthToken
}