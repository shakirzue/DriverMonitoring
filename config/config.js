var config = {
    user: 'zuetestdbadmin',
    password: 'zuetestdb@2022',
    server: 'zuetestdbsrv.database.windows.net',
    database: 'ZueTestDB',
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

var config2 = {
    user: 'zuesqladmin',
    password: 'DATAbase123',
    server: 'zuesqldbsrv.database.windows.net',
    database: 'zuesqldb',
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

module.exports = config