function readAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return authHeader.split(' ')[1];
    }
    return null;
}

function isDefined(val){

    const res = val != null
    return res
}

module.exports = {
    readAuthToken,
    isDefined
}